import {SNAP_DISTANCE} from './Config';
import {Projector} from './Projector';
import {SnapGroup} from './SnapGroup';
import {SnapWindow, WindowState, WindowIdentity} from './SnapWindow';
import {Point, PointUtils} from './utils/PointUtils';
import {RectUtils} from './utils/RectUtils';
import { TabService } from '../tabbing/TabService';

export enum eSnapValidity {
    /**
     * This is a valid snap target
     */
    VALID,

    /**
     * Can't snap two windows together corner-to-corner.
     *
     * Windows must have at least one overlapping edge.
     */
    CORNERS,

    /**
     * This snap would result in two windows in the same group overlapping each other.
     */
    OVERLAP
}

/**
 * A Point instance that is used to only specify a direction in each axis, rather than a physical offset/distance.
 *
 * The x and y values will always be either -1, 0 or 1.
 */
export type Direction = Point<-1|0|1>;

/**
 * This is effectively an enum, but TypeScript will allow it to be used with a Point object to fetch just the 'x' or
 * 'y' component of a Point.
 *
 * e.g:
 * const p: Point = getPoint();
 * const o: Orientation = 'x'; //Using any value other than 'x' or 'y' will result in a compile error
 * const x: number = p[o];
 */
export type Orientation = keyof Point;

/**
 * Interface that represents a valid candidate group for the group that the user is currently manipulating.
 *
 * As a window is dragged around, it is possible that it will be within the snapping distance of several other groups.
 * The service will create a SnapTarget for each possible snap candidate, and then select the "best" candidate as
 * being the current target. The selected target will then be passed to the UI for rendering/highlighting.
 */
export interface SnapTarget {
    /**
     * The group that has been selected as the snap candidate.
     *
     * This is not the group that the user is currently dragging, it is the group that has been selected as the snap
     * target.
     */
    group: SnapGroup;

    /**
     * The window within the active group that was used to find this candidate
     */
    activeWindow: SnapWindow;

    /**
     * The offset that will be applied to the active group, in order to correctly align it with this target.
     */
    snapOffset: Point;

    /**
     * If 'activeWindow' should be resized as part of this snap, it's new halfSize will be specified here. This only
     * happens when the active group contains a single window, and the two closest corners of that window are both
     * within the anchor distance of the corresponding corners of the candidate window.
     *
     * Will be null if we don't want the window to resize as part of the snap.
     */
    halfSize: Point|null;

    /**
     * A snap target is always generated for any groups within range of the target window.
     */
    validity: eSnapValidity;
}

/**
 * State-less class that contains all the main snap and dock logic.
 *
 * All of the code to determine if two groups are snappable, and where to place the snapped windows, exists within
 * this class.
 */
export class Resolver {
    /**
     * Util that is reset and re-used with each candidate group.
     */
    private projector: Projector = new Projector();

    /**
     * The only publicly-exposed function of this class - determines if 'activeGroup', in it's current location, should
     * be snapped to another group.
     *
     * @param groups A list of all groups within the system
     * @param activeGroup The group that is currently being moved
     */
    public getSnapTarget(groups: SnapGroup[], activeGroup: SnapGroup): SnapTarget|null {
        const projector: Projector = this.projector;
        const targets: SnapTarget[] = [];

        // Group-to-Group snapping not yet supported
        if (activeGroup.windows.length > 1) {
            return null;
        }

        // Find any groups that are close to a window in activeGroup
        groups.forEach((candidateGroup: SnapGroup) => {
            if (candidateGroup !== activeGroup) {
                // Before checking any windows, make sure the bounding boxes of each group overlaps
                if (RectUtils.distance(activeGroup, candidateGroup).within(SNAP_DISTANCE)) {
                    projector.reset();

                    // Need to iterate over every window in both groups
                    activeGroup.windows.forEach(activeWindow => {
                        const activeState: WindowState = activeWindow.getState();

                        // Only do the next loop if there's a chance that this window can intersect with the other group
                        if (this.isSnappable(activeWindow.getIdentity(), activeState) && RectUtils.distance(candidateGroup, activeState).within(SNAP_DISTANCE)) {
                            candidateGroup.windows.forEach(candidateWindow => {
                                const candidateState: WindowState = candidateWindow.getState();

                                if (this.isSnappable(candidateWindow.getIdentity(), candidateState)) {
                                    projector.project(activeState, candidateState);
                                }
                            });
                        }
                    });

                    // Create snap target
                    const target: SnapTarget|null = projector.createTarget(candidateGroup, activeGroup.windows[0]);
                    if (target) {
                        targets.push(target);
                    }
                }
            }
        });

        if (targets.length === 0) {
            return null;
        } else if (targets.length === 1) {
            return targets[0];
        } else {
            // Multiple candidate groups within range. Pick the best available target.
            return this.findBestTarget(targets);
        }
    }

    private findBestTarget(targets: SnapTarget[]): SnapTarget|null {
        // Sort candidates so that most preferable is at start of array
        targets = targets.sort((a: SnapTarget, b: SnapTarget) => {
            const offsetA: Point = a.snapOffset, offsetB: Point = b.snapOffset;

            if (a.validity !== b.validity && (a.validity === eSnapValidity.VALID || b.validity === eSnapValidity.VALID)) {
                // Prefer valid targets
                return a.validity - b.validity;
            } else if (this.isAnchorSnap(a) !== this.isAnchorSnap(b)) {
                // Prefer snaps to anchor points
                return (offsetA.x && offsetA.y) ? -1 : 1;
            } else {
                // If both candidates are valid, prefer candidate with smallest offset
                return PointUtils.lengthSquared(a.snapOffset) - PointUtils.lengthSquared(b.snapOffset);
            }
        });

        return targets[0] || null;
    }

    private isAnchorSnap(target: SnapTarget): boolean {
        return target.snapOffset.x !== 0 && target.snapOffset.y !== 0;
    }

    /**
     * Checks if a window is in the correct state to be snapped.
     *
     * If this check fails, we shouldn't be doing any bounds-checking or creating and snap targets for this window.
     *
     * @param identity Handle to the window we are considering for snapping
     * @param windowState State of the window object we are considering for snapping
     */
    private isSnappable(identity: WindowIdentity, windowState: WindowState): boolean {
        return !windowState.hidden && windowState.opacity > 0 && windowState.state === 'normal' && TabService.INSTANCE.getTab(identity) === undefined;
    }
}