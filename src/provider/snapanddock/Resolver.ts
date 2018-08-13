import {SnapGroup} from './SnapGroup';
import {SnapWindow, WindowState} from './SnapWindow';
import {Point} from './utils/PointUtils';
import {Range, RangeUtils} from './utils/RangeUtils';
import {MeasureResult, RectUtils} from './utils/RectUtils';


/**
 * The maximum distance at which two windows will snap together.
 */
const SNAP_DISTANCE = 35;

/**
 * If two window corners would snap to a distance less than this threshold, the active window will be snapped to the
 * corner of the candidate window.
 *
 * This radius essentially defines how "sticky" the corners of windows are. Larger values makes it easier to align
 * windows.
 */
const ANCHOR_DISTANCE = 100;

/**
 * The minimum amount of overlap required for two window edges to snap together.
 */
const MIN_OVERLAP = 50;

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

    /**
     * Indicates the general direction in which the window is snapping.
     */
    direction: Direction;

    /**
     * Indicates if this snap is in a horizontal or vertical direction.
     *
     * This overlaps with direction (direction[orientation] will always be non-zero).
     */
    orientation: Orientation;
}


/**
 * Short-lived temporary object. This is used to keep track of the best group we've found so far when deciding what the
 * active group should snap to.
 *
 * If there is nothing within range for the active group to snap to, this object will remain in a
 * nullified/un-initailsed state.
 */
interface SnapCandidate {
    /**
     * The group that is our current candidate
     */
    group: SnapGroup|null;

    activeWindow: SnapWindow|null;
    candidateWindow: SnapWindow|null;

    /**
     * The absolute distance between the two windows.
     *
     * When there are multiple snap candidates, the candidate with the smallest distance will be preferred.
     */
    distance: number;

    /**
     * The result of the Rectangle-Rectangle distance check that resulted in this candidate being created.
     */
    measure: MeasureResult|null;

    /**
     * Indicates the direction of 'otherWindow' relative to 'activeWindow', in each dimension.
     *
     * Both x and y wil be either -1, 0 or 1 - with the following meanings:
     * -1: otherWindow is to the the left/top of activeWindow
     *  0: otherWindow and activeWindow are horizontally/vertically aligned
     *  1: otherWindow is to the right/bottom of activeWindow
     */
    direction: Direction;
}

/**
 * A verison of SnapCandidate where all fields are non-null.
 *
 * Since SnapCandidate is used in a way where it starts out uninitialised, this type exists to represent a candidate
 * that we know was actually initialised.
 */
type ValidCandidate = {
    [P in keyof SnapCandidate]: NonNullable<SnapCandidate[P]>
};

/**
 * State-less class that contains all the main snap and dock logic.
 *
 * All of the code to determine if two groups are snappable, and where to place the snapped windows, exists within
 * this class.
 */
export class Resolver {
    /**
     * The only publicly-exposed function of this class - determines if 'activeGroup', in it's current location, should
     * be snapped to another group.
     *
     * @param groups A list of all groups within the system
     * @param activeGroup The group that is currently being moved
     */
    public getSnapTarget(groups: SnapGroup[], activeGroup: SnapGroup): SnapTarget|null {
        if (activeGroup.windows.length > 1) {
            //Group-to-Group snapping not yet supported
            return null;
        }

        const candidate: SnapCandidate = this.findSnapCandidates(groups, activeGroup);

        if (this.isValidCandidate(candidate)) {
            return this.createSnapTarget(candidate);
        } else {
            return null;
        }
    }

    private findSnapCandidates(groups: SnapGroup[], activeGroup: SnapGroup): SnapCandidate {
        // We'll use this to store the best candidate we find
        const bestCandidate:
            SnapCandidate = {group: null, activeWindow: null, candidateWindow: null, distance: Number.MAX_VALUE, measure: null, direction: {x: 0, y: 0}};

        // Find any windows that are close to the a window in activeGroup
        groups.forEach((candidateGroup: SnapGroup) => {
            if (candidateGroup !== activeGroup) {
                // Before checking any windows, make sure the bounding boxes of each group overlaps
                if (RectUtils.distance(activeGroup, candidateGroup).within(SNAP_DISTANCE)) {
                    // Need to iterate over every window in both groups
                    activeGroup.windows.forEach(activeWindow => {
                        const activeState = activeWindow.getState();

                        // Only do the next loop if there's a chance that this window can intersect with the other group
                        if (this.isSnappable(activeState) && RectUtils.distance(candidateGroup, activeState).within(SNAP_DISTANCE)) {
                            candidateGroup.windows.forEach(candidateWindow => {
                                this.checkForSnap(activeWindow, activeState, candidateWindow, bestCandidate);
                            });
                        }
                    });
                }
            }
        });

        return bestCandidate;
    }

    private isValidCandidate(candidate: SnapCandidate): candidate is ValidCandidate {
        return candidate.group !== null;
    }

    private intersect(candidateWindow: SnapWindow, groupWindow: SnapWindow) {
        const candidateWindowState = candidateWindow.getState();
        const groupWindowState = groupWindow.getState();
        const distance = RectUtils.distance(candidateWindowState, groupWindowState);
        return (distance.x <= 0 && distance.y <= 0);
    }

    /**
     * Converts a SnapCandidate to a SnapTarget. This requires determining that the snap won't violate any
     * constraints, and also calculating exactly where the group should snap to.
     *
     * @param candidate A snap candidate. Needs to be an "actual" candidate - not just a newly-initialised SnapCandidate object
     */
    private createSnapTarget(candidate: ValidCandidate): SnapTarget {
        // Create a snap target with the best-match pair of windows (if there was such a pair)
        let result: eSnapValidity = eSnapValidity.VALID;  // Assume valid, unless we find an issue
        const snapOffset: Point = {x: 0, y: 0};
        const measure: MeasureResult = candidate.measure;
        let orientation: Orientation = 'x';
        let halfSize: Point|null = null;

        // Snap groups together
        if (this.shouldSnapAlongAxis(measure, 'x')) {
            snapOffset.x = measure.x * candidate.direction.x;
        }
        if (this.shouldSnapAlongAxis(measure, 'y')) {
            snapOffset.y = measure.y * candidate.direction.y;
            orientation = 'y';
        }

        // Ensure this snap doesn't invalidate any constraints
        if (measure.x >= -MIN_OVERLAP && measure.y >= -MIN_OVERLAP) {
            result = eSnapValidity.CORNERS;
        } else {
            // TODO: Ensure no windows in the snapped-together group would overlap each other (SERVICE-129)
        }

        // Snap to anchor points
        if (result !== eSnapValidity.CORNERS) {
            const anchorOrientation: Orientation = (orientation === 'x') ? 'y' : 'x';
            const activeState: WindowState = candidate.activeWindow.getState();
            const candidateState: WindowState = candidate.candidateWindow.getState();

            const activeRange: Range = RangeUtils.createFromRect(activeState, anchorOrientation);
            const candidateRange: Range = RangeUtils.createFromRect(candidateState, anchorOrientation);
            const anchoredRange: Range = RangeUtils.snap(candidateRange, activeRange, ANCHOR_DISTANCE, candidate.activeWindow.getGroup().length === 1);

            if (!RangeUtils.equal(activeRange, anchoredRange)) {
                snapOffset[anchorOrientation] = anchoredRange.min - activeRange.min;

                if (anchorOrientation === 'x') {
                    halfSize = {x: RangeUtils.size(anchoredRange) / 2, y: activeState.halfSize.y};
                } else {
                    halfSize = {x: activeState.halfSize.x, y: RangeUtils.size(anchoredRange) / 2};
                }
            }
        }

        return {
            group: candidate.group,
            activeWindow: candidate.activeWindow,
            snapOffset,
            halfSize,
            validity: result,
            direction: candidate.direction,
            orientation
        };
    }

    /**
     * Checks if a window is in the correct state to be snapped.
     *
     * If this check fails, we shouldn't be doing any bounds-checking or creating and snap targets for this window.
     *
     * @param windowState State of the window object we are considering for snapping
     */
    private isSnappable(windowState: WindowState): boolean {
        return !windowState.hidden && windowState.opacity > 0 && windowState.state === 'normal';
    }

    /**
     * Checks a pair of windows to see if they are within snapping-distance of each other.
     *
     * Any windows within snapping distance are pushed into a list, and we will later select the best available
     * candidate.
     *
     * @param activeWindow The window within the active group that we're currently testing
     * @param activeState The state of activeWindow
     * @param candidateWindow The window within the non-active group that we want to check against activeWindow
     * @param currentTarget Details about the best candidate we have found so far (if any)
     */
    private checkForSnap(activeWindow: SnapWindow, activeState: WindowState, candidateWindow: SnapWindow, currentTarget: SnapCandidate): void {
        let distBtwnWindows: MeasureResult;
        const candidateState: WindowState = candidateWindow.getState();

        if (this.isSnappable(candidateState)) {
            distBtwnWindows = RectUtils.distance(activeState, candidateState);

            if (distBtwnWindows.border(SNAP_DISTANCE)) {
                // Calculate the distance between windows, for comparison purposes
                let distance;
                if (distBtwnWindows.x >= 0 || distBtwnWindows.y >= 0) {
                    distance = Math.max(distBtwnWindows.x, 0) + Math.max(distBtwnWindows.y, 0);
                } else {
                    distance = Math.min(-distBtwnWindows.x, -distBtwnWindows.y);
                }

                // Save this candidate, unless we have a better candidate already
                if (distance < currentTarget.distance) {
                    currentTarget.group = candidateWindow.getGroup();
                    currentTarget.activeWindow = activeWindow;
                    currentTarget.candidateWindow = candidateWindow;
                    currentTarget.measure = distBtwnWindows;
                    currentTarget.distance = distance;
                    currentTarget.direction!.x = Math.sign(candidateState.center.x - activeState.center.x) as (-1 | 0 | 1);
                    currentTarget.direction!.y = Math.sign(candidateState.center.y - activeState.center.y) as (-1 | 0 | 1);
                }
            }
        }
    }

    /**
     * Given a point that indicates the overlap/separation between two rectangles, decides if the rectangles should be
     * snapped-together. This function only considers a single axis at a time.
     *
     * @param offset Specifies the overlap/separation of two rectangles, in each dimension. @see MeasureResult
     * @param axis Which orientation we're currently considering
     */
    private shouldSnapAlongAxis(offset: Point, axis: Orientation): boolean {
        const distToRectangle: number = offset[axis];
        const oppositeDistance: number = offset[axis === 'x' ? 'y' : 'x'];

        if (distToRectangle > 0 && oppositeDistance > 0) {
            // User is trying to join windows corner-to-corner, since there is no overlap in either dimension.
            // This is a bit of special-case, it's the only time we'll snap on both the X and Y axes at the same time.
            return true;
        } else if (Math.abs(distToRectangle) < SNAP_DISTANCE) {
            // Rectangles overlap, and by less than the snap distance.
            // Should snap, unless we're on a corner and we're overlapping by a larger amount in the opposite dimension
            return oppositeDistance < 0 && !(distToRectangle < 0 && oppositeDistance > distToRectangle);
        } else {
            // Rectangles overlap, but by more than the snap distance.
            return false;
        }
    }
}