import {DesktopEntity} from '../model/DesktopEntity';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {EntityState} from '../model/DesktopWindow';
import {eTargetType} from '../WindowHandler';

import {ANCHOR_DISTANCE, MIN_OVERLAP, SNAP_DISTANCE} from './Config';
import {Orientation, SnapTarget} from './Resolver';
import {Point, PointUtils} from './utils/PointUtils';
import {Range, RangeUtils} from './utils/RangeUtils';
import {MeasureResult, Rectangle, RectUtils} from './utils/RectUtils';

export enum eDirection {
    LEFT,
    TOP,
    RIGHT,
    BOTTOM
}

/**
 * Specialised util class for determining the closest windows in each direction of an active group.
 *
 * Will process surrounding windows one at a time, gradually building up a map of possible snap locations. If a window
 * is found that intersects the active group, the entire projection will be flagged as invalid.
 */
export class Projector {
    /**
     * Specifies if the active window is being blocked from snapping in the current position due to a candidate window
     * being in the way.
     */
    private _blocked: boolean;

    /**
     * This util manages each of the four cardinal directions independently, before clipping each of the edges against
     * it's neighbours at the end of the process.
     */
    private _borders: [BorderProjection, BorderProjection, BorderProjection, BorderProjection];

    constructor() {
        this._blocked = false;
        this._borders = [
            new BorderProjection(eDirection.LEFT),
            new BorderProjection(eDirection.TOP),
            new BorderProjection(eDirection.RIGHT),
            new BorderProjection(eDirection.BOTTOM)
        ];

        this.reset();
    }

    /**
     * Resets the state of this util, so it can be re-used for a different candidate group
     */
    public reset(): void {
        this._blocked = false;
        this._borders.forEach(border => {
            border.limit = border.direction < 2 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            border.distance = Number.MAX_SAFE_INTEGER;
            border.min = Number.MAX_SAFE_INTEGER;
            border.max = Number.MIN_SAFE_INTEGER;
        });
    }

    /**
     * Projects a candidate window onto the relevant edge of the active window, and updates the model if the active
     * group can be snapped to this candidate group.
     *
     * @param activeState The window currently being dragged
     * @param candidateState A window that 'activeWindow' may be able to snap to
     * @param snapDistance The maximum distance between two windows for them to snap together
     */
    public project(activeState: Rectangle, candidateState: Rectangle): void {
        const distBtwnWindows: MeasureResult = RectUtils.distance(activeState, candidateState);
        const direction: eDirection = this.getDirectionFromOffset(distBtwnWindows, activeState, candidateState);
        const isValid: boolean = this._borders[direction].project(activeState, candidateState, distBtwnWindows);

        this._blocked = this._blocked || !isValid;
    }

    /**
     * Once the projection has been fully built, determines if there is a valid snap target.
     *
     * If so, a SnapTarget object will be built and returned, otherwise will return null.
     *
     * @param candidateGroup The group that was used to build this projection
     * @param activeWindow The window that is being moved by the user
     */
    public createTarget(candidateGroup: DesktopSnapGroup, activeWindow: DesktopEntity): SnapTarget|null {
        const borders: BorderProjection[] = this._borders;

        if (!this._blocked) {
            const activeState: EntityState = activeWindow.currentState;
            const snapOffset: Point = {x: 0, y: 0};
            const halfSize: Point = PointUtils.clone(activeState.halfSize);
            const validDirections: BorderProjection[] = borders.filter((border: BorderProjection) => {
                return border.distance < Number.MAX_SAFE_INTEGER && border.getOverlap(activeState) >= MIN_OVERLAP && border.distance <= SNAP_DISTANCE;
            });

            if (validDirections.length > 0) {
                // Clip each range to each of its neighbours
                this.clipProjections();


                // Snap active window to each active border
                validDirections.forEach((border: BorderProjection) => {
                    const opposite: BorderProjection = borders[(border.direction + 2) % 4];

                    if (opposite.distance > SNAP_DISTANCE) {
                        // Move rectangle to touch this edge
                        snapOffset[border.orientation] = border.distance * Math.sign(0.5 - Math.floor(border.direction / 2));

                        // Snap to min/max points
                        if (validDirections.length === 1) {
                            const snapToMin: boolean =
                                Math.abs((activeState.center[border.opposite] - activeState.halfSize[border.opposite]) - border.min) < ANCHOR_DISTANCE;
                            const snapToMax: boolean =
                                Math.abs((activeState.center[border.opposite] + activeState.halfSize[border.opposite]) - border.max) < ANCHOR_DISTANCE;

                            if (snapToMin && snapToMax) {
                                const {minSize, maxSize, resizableMin, resizableMax} = activeState.resizeConstraints[border.opposite];
                                const targetBorderLength = (border.max - border.min);

                                // Only resize if it would not violate any constraints
                                if ((resizableMin || resizableMax) && targetBorderLength >= minSize && targetBorderLength <= maxSize) {
                                    halfSize[border.opposite] = targetBorderLength / 2;
                                }
                                snapOffset[border.opposite] = ((border.min + border.max) / 2) - activeState.center[border.opposite];
                                snapOffset[border.opposite] = ((border.min + border.max) / 2) - activeState.center[border.opposite] +
                                    (activeState.halfSize[border.opposite] - halfSize[border.opposite]);
                            } else if (snapToMin) {
                                snapOffset[border.opposite] = (border.min - activeState.center[border.opposite]) + halfSize[border.opposite];
                            } else if (snapToMax) {
                                snapOffset[border.opposite] = (border.max - activeState.center[border.opposite]) - halfSize[border.opposite];
                            }
                        }
                    } else if (border.direction < 2) {
                        // Move and resize rectangle to touch both this edge and the opposite edge
                        halfSize[border.orientation] = Math.abs(border.limit - opposite.limit) / 2;
                        snapOffset[border.orientation] = ((border.limit + opposite.limit) / 2) - activeState.center[border.orientation];

                        snapOffset[border.orientation] += activeState.halfSize[border.orientation] - halfSize[border.orientation];
                    } else {
                        // Need to touch both edges, but the opposite edge has already handled this. Nothing to do.
                    }
                });

                return {group: candidateGroup, activeWindow, offset: snapOffset, halfSize, valid: true, type: eTargetType.SNAP};
            }
        }

        return null;
    }

    /**
     * Determines the direction of the candidate window, relative to the active window. If windows are positioned
     * diagonally, the dimension with the smallest offset takes precidence.
     *
     * e.g: Will return eDirection.LEFT if the candidate window is to the left of the active window.
     *
     * @param offset Distance between the active and candidate windows in each dimension (@see RectUtils.distance)
     * @param activeState The state of the active window
     * @param candidateState The state of the candidate window
     */
    private getDirectionFromOffset(offset: Point, activeState: Rectangle, candidateState: Rectangle): eDirection {
        let orientation: Orientation;

        // Dertermine orientation
        if (Math.sign(offset.x) === Math.sign(offset.y)) {
            orientation = offset.x > offset.y ? 'x' : 'y';
        } else {
            orientation = offset.x >= 0 ? 'x' : 'y';
        }

        // Determine direction
        if (orientation === 'x') {
            return activeState.center.x < candidateState.center.x ? eDirection.LEFT : eDirection.RIGHT;
        } else {
            return activeState.center.y < candidateState.center.y ? eDirection.TOP : eDirection.BOTTOM;
        }
    }

    private clipProjections(): void {
        const borders: BorderProjection[] = this._borders;

        for (let i = 0; i < 4; i++) {
            borders[i].clip(borders[(i + 1) % 4]);
            borders[i].clip(borders[(i + 3) % 4]);
        }
    }
}

/**
 * A sub-set of a projection. An instance of this class is created for each of the four directions around the active
 * group. This will then process all candidate windows that fall on that side of the active window.
 */
class BorderProjection implements Range {
    /**
     * Indicates which side of the active window this border operates on
     */
    public direction: eDirection;

    /**
     * The axis that this border lies on (e.g. A direction of 'LEFT' has an orientation of 'x' - since 'left' indicates a direction on the x axis).
     *
     * This is the axis that the active window will need to be moved in order to snap to a candidate in this direction.
     */
    public orientation: Orientation;

    /**
     * The opposite of 'orientation' (e.g. A direction of 'LEFT' has an opposite of 'y').
     *
     * This is the axis that the active window will need to be moved in if anchoring to one of the ends of this border.
     */
    public opposite: Orientation;

    public distance: number;  //< Distance between the edge of the active window and the closest candidate window in this direction
    public limit: number;     //< Absolute pixel co-ordinate of the closest candidate window in this direction. (for the 'orienatation' axis)
    public min: number;  //< Minimium extent of this border. Initialised to very large positive number, so that any 'less than' check for the first window to
                         // find will always pass.
    public max: number;  //< Maximum extend of this border. Initialised to very large negative number, so that any 'greater than' check for the first window to
                         // find will always pass.

    constructor(direction: eDirection) {
        this.direction = direction;
        this.orientation = (direction % 2) ? 'y' : 'x';
        this.opposite = (direction % 2) ? 'x' : 'y';

        this.limit = this.direction < 2 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        this.distance = Number.MAX_SAFE_INTEGER;
        this.min = Number.MAX_SAFE_INTEGER;
        this.max = Number.MIN_SAFE_INTEGER;
    }

    /**
     * Adds a window to this projection. This should be called for every candidate within range of the active window that falls on this side of the active
     * window.
     *
     * @param activeState Window that is having candidates projected upon it
     * @param candidateState Window that is being projected
     * @param distBtwnWindows The offset between the two windows
     */
    public project(activeState: Rectangle, candidateState: Rectangle, distBtwnWindows: MeasureResult): boolean {
        if (distBtwnWindows.x < -SNAP_DISTANCE && distBtwnWindows.y < -SNAP_DISTANCE) {
            return false;
        } else if (distBtwnWindows.border(Math.max(SNAP_DISTANCE, ANCHOR_DISTANCE))) {
            const orientation: Orientation = this.orientation;
            const candidateLimit = candidateState.center[orientation] +
                (candidateState.halfSize[orientation] * Math.sign(activeState.center[orientation] - candidateState.center[orientation]));
            this.limit = (this.direction < 2) ? Math.min(this.limit, candidateLimit) : Math.max(this.limit, candidateLimit);
            return this.addToRange(activeState, candidateState, distBtwnWindows[orientation]);
        }

        return true;
    }

    /**
     * Returns the overlap between the active window and this axis of the projection.
     *
     * @param activeState The window that this projection is based on
     */
    public getOverlap(activeState: Rectangle): number {
        const center: number = (this.min + this.max) / 2;
        const halfSize: number = (this.max - this.min) / 2;

        return (activeState.halfSize[this.opposite] + halfSize) - Math.abs(activeState.center[this.opposite] - center);
    }

    /**
     * Ensures that the line created by this border doesn't intersect any neighbouring borders.
     *
     * It is important that borders do not intersect, otherwise the service could snap a window into a position that intersects a window within a candidate
     * group.
     *
     * By clipping these ranges we ensure the window will snap to the corner where the ranges intersect, rather than snapping to an invalid position.
     *
     * @param other A neighbouring border that we should clip this range against
     */
    public clip(other: BorderProjection): void {
        if (other.distance < Number.MAX_SAFE_INTEGER && RangeUtils.within(this, other.limit)) {
            // Constrain this range by the limits of the intersecting range
            const mid = (this.min + this.max) / 2;
            if (other.limit < mid) {
                this.min = Math.max(this.min, other.limit);
            } else {
                this.max = Math.min(this.min, other.limit);
            }
        }
    }

    private addToRange(activeState: Rectangle, candidateState: Rectangle, distance: number): boolean {
        if (distance <= this.distance) {
            const opposite: Orientation = this.opposite;

            if (Math.abs(activeState.center[opposite] - candidateState.center[opposite]) > activeState.halfSize[opposite] + candidateState.halfSize[opposite]) {
                console.log('No overlap in ' + opposite + ' axis');
                return true;
            }

            this.distance = distance;

            const min: number = candidateState.center[opposite] - candidateState.halfSize[opposite];
            const max: number = candidateState.center[opposite] + candidateState.halfSize[opposite];
            const isContiguous: boolean = this.min > this.max || RangeUtils.within(this, min) || RangeUtils.within(this, max);

            if (isContiguous || this.windowBridgesRanges(activeState, RangeUtils.createFromRect(candidateState, this.opposite))) {
                this.min = Math.min(this.min, min);
                this.max = Math.max(this.max, max);
            } else {
                // Seems the active window lies fully between two windows, overlapping neither.
                // Nothing we can snap to in this scenario.
                console.log('Window falls within gap');
                return false;
            }
        }

        return true;
    }

    /**
     * Checks if 'activeWindow' overlaps both this and otherRange
     *
     * @param activeWindow Window that is currently being projected onto surrounding candidates
     * @param otherRange The projection of a candidate window onto activeWindow
     */
    private windowBridgesRanges(activeWindow: Rectangle, otherRange: Range): boolean {
        const gapMin: number = Math.min(this.max, otherRange.max);
        const gapMax: number = Math.max(this.min, otherRange.min);

        const center: number = activeWindow.center[this.opposite];
        const halfSize: number = activeWindow.halfSize[this.opposite];

        return gapMin >= center - halfSize && gapMax <= center + halfSize;
    }
}
