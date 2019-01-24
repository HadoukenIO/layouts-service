import {ConfigStore} from '../main';
import {DesktopEntity} from '../model/DesktopEntity';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {EntityState} from '../model/DesktopWindow';
import {eTargetType, TargetBase} from '../WindowHandler';

import {SNAP_DISTANCE} from './Constants';
import {Projector} from './Projector';
import {Point, PointUtils} from './utils/PointUtils';
import {Rectangle, RectUtils} from './utils/RectUtils';


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
export interface SnapTarget extends TargetBase {
    type: eTargetType.SNAP;

    /**
     * The offset that will be applied to the active group, in order to correctly align it with this target.
     */
    offset: Point;

    /**
     * If 'activeWindow' should be resized as part of this snap, it's new halfSize will be specified here. This only
     * happens when the active group contains a single window, and the two closest corners of that window are both
     * within the anchor distance of the corresponding corners of the candidate window.
     *
     * Will be null if we don't want the window to resize as part of the snap.
     */
    halfSize: Point|null;


    /**
     * The group that has been selected as the target candidate.
     *
     * This is not the group that the user is currently dragging, it is the group that has been selected as the target.
     */
    targetGroup: DesktopSnapGroup;
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
    private _projector: Projector = new Projector();

    private _config: ConfigStore;

    constructor(config: ConfigStore) {
        this._config = config;
    }

    /**
     * The only publicly-exposed function of this class - determines if 'activeGroup', in it's current location, should
     * be snapped to another group.
     *
     * @param groups A list of all groups within the system
     * @param activeGroup The group that is currently being moved
     */
    public getSnapTarget(groups: ReadonlyArray<DesktopSnapGroup>, activeGroup: DesktopSnapGroup): SnapTarget|null {
        const projector: Projector = this._projector;
        const targets: SnapTarget[] = [];

        // Group-to-Group snapping not yet supported
        if (activeGroup.entities.length > 1) {
            return null;
        }

        // Find any groups that are close to a window in activeGroup
        groups.forEach((candidateGroup: DesktopSnapGroup) => {
            if (candidateGroup !== activeGroup) {
                // Before checking any windows, make sure the bounding boxes of each group overlaps
                if (RectUtils.distance(activeGroup, candidateGroup).within(SNAP_DISTANCE)) {
                    projector.reset();

                    // Need to iterate over every window in both groups
                    activeGroup.entities.forEach(activeWindow => {
                        const activeState: EntityState = activeWindow.currentState;

                        // Only do the next loop if there's a chance that this window can intersect with the other group
                        if (this.isSnappable(activeWindow, activeState) && RectUtils.distance(candidateGroup, activeState).within(SNAP_DISTANCE)) {
                            candidateGroup.entities.forEach(candidateWindow => {
                                const candidateState: EntityState = candidateWindow.currentState;

                                if (this.isSnappable(candidateWindow, candidateState)) {
                                    projector.project(activeState, candidateState);
                                }
                            });
                        }
                    });

                    // Create snap target
                    const target: SnapTarget|null = projector.createTarget(candidateGroup, activeGroup.entities[0]);
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
            const offsetA: Point = a.offset, offsetB: Point = b.offset;

            if (a.valid !== b.valid) {
                // Prefer valid targets
                return a.valid ? 1 : -1;
            } else if (this.isAnchorSnap(a) !== this.isAnchorSnap(b)) {
                // Prefer snaps to anchor points
                return (offsetA.x && offsetA.y) ? -1 : 1;
            } else {
                // If both candidates are valid, prefer candidate with smallest offset
                return PointUtils.lengthSquared(a.offset) - PointUtils.lengthSquared(b.offset);
            }
        });

        return targets[0] || null;
    }

    private isAnchorSnap(target: SnapTarget): boolean {
        return target.offset.x !== 0 && target.offset.y !== 0;
    }

    /**
     * Checks if a window is in the correct state to be snapped.
     *
     * If this check fails, we shouldn't be doing any bounds-checking or creating and snap targets for this window.
     *
     * @param identity Handle to the window we are considering for snapping
     * @param state State of the window object we are considering for snapping
     */
    private isSnappable(window: DesktopEntity, state: EntityState): boolean {
        return !state.hidden && state.opacity > 0 && state.state === 'normal' && this._config.query({level: 'window', ...window.identity}).features.snap;
    }
}