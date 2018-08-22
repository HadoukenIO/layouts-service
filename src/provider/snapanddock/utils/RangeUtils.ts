import {Orientation, SNAP_DISTANCE, ANCHOR_DISTANCE, SnapTarget, eSnapValidity} from '../Resolver';

import {Rectangle, MeasureResult, RectUtils} from './RectUtils';
import {WindowState, SnapWindow} from '../SnapWindow';
import { Point } from 'hadouken-js-adapter/out/types/src/api/system/point';
import { PointUtils } from './PointUtils';
import { SnapGroup } from '../SnapGroup';

/**
 * Small interface representing a one-dimensional span.
 */
export interface Range {
    min: number;
    max: number;
}

export enum eDirection {
    LEFT,
    TOP,
    RIGHT,
    BOTTOM
}

export class SnapRanges {
    public ranges: [SnapRange, SnapRange, SnapRange, SnapRange];

    constructor() {
        this.ranges = [
            new SnapRange(eDirection.LEFT),
            new SnapRange(eDirection.TOP),
            new SnapRange(eDirection.RIGHT),
            new SnapRange(eDirection.BOTTOM)
        ];
    }

    public reset(): void {
        this.ranges.forEach((range: SnapRange) => {
            range.blocked = false;
            range.distance = Number.MAX_SAFE_INTEGER;
            range.limit = 0;
            range.min = Number.MAX_SAFE_INTEGER;
            range.max = Number.MIN_SAFE_INTEGER;
        });
    }

    public add(activeState: WindowState, candidateState: WindowState, snapDistance: number): void {
        const distBtwnWindows: MeasureResult = RectUtils.distance(activeState, candidateState);
        const direction: eDirection = this.getDirectionFromOffset(distBtwnWindows, activeState, candidateState);
        
        this.ranges[direction].add(activeState, candidateState, distBtwnWindows, snapDistance);
    }

    public merge(): void {
        const ranges = this.ranges;

        for(let i=0; i<4; i++) {
            ranges[i].merge(ranges[(i + 1) % 4]);
            ranges[i].merge(ranges[(i + 3) % 4]);
        }
    }

    // public snap(activeState: WindowState): {offset: Point; halfSize?: Point}|null {
    public createTarget(candidateGroup: SnapGroup, activeWindow: SnapWindow): SnapTarget|null {
        const ranges = this.ranges;

        //Count number of valid ranges, ensure activeWindow doesn't overlap any window in the candidate group
        let isBlocked = false;
        let numValidRanges = 0;
        ranges.forEach(range => {
            isBlocked = isBlocked || range.blocked;
            if (range.distance < Number.MAX_SAFE_INTEGER) {
                ++numValidRanges;
            }
        });
        
        if (numValidRanges > 0 && !isBlocked) {
            const activeState = activeWindow.getState();
            const snapOffset = {x: 0, y: 0};
            const halfSize = PointUtils.clone(activeState.halfSize);

            // Clip each range to each of its neighbours
            this.merge();

            // Snap active window to each active range
            ranges.forEach((range, index) => {
                if (range.distance < Number.MAX_SAFE_INTEGER) {
                    const opposite = ranges[(index + 2) % 4];

                    if (opposite.distance === Number.MAX_SAFE_INTEGER) {
                        //Move rectangle to touch this edge
                        snapOffset[range.orientation] = range.distance * Math.sign(0.5 - Math.floor(range.direction / 2));

                        //Snap to min/max points
                        if (numValidRanges === 1) {
                            const snapToMin = Math.abs((activeState.center[range.opposite] - activeState.halfSize[range.opposite]) - range.min) < ANCHOR_DISTANCE;
                            const snapToMax = Math.abs((activeState.center[range.opposite] + activeState.halfSize[range.opposite]) - range.max) < ANCHOR_DISTANCE;

                            if (snapToMin && snapToMax) {
                                halfSize[range.opposite] = (range.max - range.min) / 2;
                                snapOffset[range.opposite] = ((range.min + range.max) / 2) - activeState.center[range.opposite];
                                snapOffset[range.opposite] = ((range.min + range.max) / 2) - activeState.center[range.opposite] + (activeState.halfSize[range.opposite] - halfSize[range.opposite]);
                            } else if (snapToMin) {
                                snapOffset[range.opposite] = (range.min - activeState.center[range.opposite]) + halfSize[range.opposite];
                            } else if (snapToMax) {
                                snapOffset[range.opposite] = (range.max - activeState.center[range.opposite]) - halfSize[range.opposite];
                            }
                        }
                    } else if (index < 2) {
                        //Move and resize rectangle to touch both this edge and the opposite edge
                        halfSize[range.orientation] = Math.abs(range.limit - opposite.limit) / 2;
                        snapOffset[range.orientation] = ((range.limit + opposite.limit) / 2) - activeState.center[range.orientation];
                        
                        snapOffset[range.orientation] += activeState.halfSize[range.orientation] - halfSize[range.orientation];
                    } else {
                        //Need to touch both edges, but the opposite edge has already handled this. Nothing to do.
                    }
                }
            });

            return {
                group: candidateGroup,
                activeWindow,
                snapOffset,
                halfSize,
                validity: eSnapValidity.VALID
            };
        } else {
            return null;
        }
    }

    private getDirectionFromOffset(offset: Point, activeState: WindowState, candidateState: WindowState): eDirection {
        let orientation: Orientation;

        //Dertermine orientation
        if (offset.x >= 0 && offset.y >= 0) {
            orientation = offset.x > offset.y ? 'x' : 'y';
        } else if (offset.x < 0 && offset.y < 0) {
            orientation = offset.x > offset.y ? 'x' : 'y';
        } else {
            orientation = offset.x >= 0 ? 'x' : 'y';
        }

        //Determine direction
        if (orientation === 'x') {
            return activeState.center.x < candidateState.center.x ? eDirection.LEFT : eDirection.RIGHT;
        } else {
            return activeState.center.y < candidateState.center.y ? eDirection.TOP : eDirection.BOTTOM;
        }
    }
}

export class SnapRange implements Range {
    public direction: eDirection;
    public orientation: Orientation;
    public opposite: Orientation;

    public blocked: boolean;
    public distance: number;
    public limit: number;
    public min: number;
    public max: number;

    constructor(direction: eDirection) {
        this.direction = direction;
        this.orientation = (direction % 2) ? 'y' : 'x';
        this.opposite = (direction % 2) ? 'x' : 'y';

        this.blocked = false;
        this.distance = Number.MAX_SAFE_INTEGER;
        this.limit = 0;
        this.min = Number.MAX_SAFE_INTEGER;
        this.max = Number.MIN_SAFE_INTEGER;
    }

    public add(activeState: WindowState, candidateState: WindowState, distBtwnWindows: MeasureResult, snapDistance: number): void {
        if (distBtwnWindows.x < -SNAP_DISTANCE && distBtwnWindows.y < -SNAP_DISTANCE) {
            this.blocked = true;
        } else if (distBtwnWindows.border(snapDistance)) {
            const orientation: Orientation = this.orientation;
            this.limit = candidateState.center[orientation] + (candidateState.halfSize[orientation] * Math.sign(activeState.center[orientation] - candidateState.center[orientation]));
            this.addToRange(activeState, candidateState, distBtwnWindows[orientation]);
        }
    }

    public merge(other: SnapRange): void {
        if (other.distance < Number.MAX_SAFE_INTEGER && RangeUtils.within(this, other.limit)) {
            //Constrain this range by the limits of the intersecting range
            this.min = Math.max(this.min, other.limit);
            this.max = Math.min(this.max, other.limit);
        }
    }

    private addToRange(activeState: WindowState, candidateState: WindowState, distance: number): void {
        if (distance <= this.distance) {
            const opposite: Orientation = this.opposite;

            if (Math.abs(activeState.center[opposite] - candidateState.center[opposite]) > activeState.halfSize[opposite] + candidateState.halfSize[opposite]) {
                console.log("No overlap in " + opposite + " axis");
                return;
            }

            this.distance = distance;

            const min = candidateState.center[opposite] - candidateState.halfSize[opposite];
            const max = candidateState.center[opposite] + candidateState.halfSize[opposite];
            const isContiguous = this.min > this.max || RangeUtils.within(this, min) || RangeUtils.within(this, max);

            if (isContiguous || this.windowBridgesRanges(activeState, RangeUtils.createFromRect(candidateState, this.opposite))) {
                this.min = Math.min(this.min, min);
                this.max = Math.max(this.max, max);
            } else {
                console.log("TODO: Handle split range");
                this.blocked = true;
            }
        }
    }

    private windowBridgesRanges(activeWindow: WindowState, otherRange: Range): boolean {
        const gapMin = Math.min(this.max, otherRange.max);
        const gapMax = Math.max(this.min, otherRange.min);

        const center = activeWindow.center[this.opposite];
        const halfSize = activeWindow.halfSize[this.opposite];

        return gapMin >= center - halfSize && gapMax <= center + halfSize;
    }
}

export class RangeUtils {
    public static size(range: Range): number {
        return range.max - range.min;
    }

    public static equal(range1: Range, range2: Range): boolean {
        return range1.min === range2.min && range1.max === range2.max;
    }

    public static within(range: Range, value: number): boolean {
        return value >= range.min && value <= range.max;
    }

    public static createFromRect(rect: Rectangle, orientation: Orientation): Range {
        const min = rect.center[orientation] - (rect.halfSize[orientation]);
        const max = rect.center[orientation] + (rect.halfSize[orientation]);

        return {min, max};
    }

    /**
     * Aligns one range against another. If either endpoint of 'align' is within 'maxSnapDist' of the corresponding
     * endpoint of 'target', then that endpoint will be snapped to match target.
     *
     * Will always return a new instance, even if no changes are made.
     *
     * @param target Static range, which we are comparing against
     * @param align A range that we are trying to line-up against target
     * @param maxSnapDist The maximum distance by which points in 'align' can be moved
     */
    public static snap(target: Range, align: Range, maxSnapDist: number, canResize: boolean): Range {
        const minInRange: boolean = Math.abs(target.min - align.min) < maxSnapDist;
        const maxInRange: boolean = Math.abs(target.max - align.max) < maxSnapDist;

        const min = minInRange ? target.min : align.min;
        const max = maxInRange ? target.max : align.max;

        if (minInRange !== maxInRange) {
            if (Math.abs(this.size(target) - this.size(align)) < maxSnapDist) {
                // Snapping one point has put the other point within the snapping range - snap both min and max to 'target'
                return {...target};
            } else if (minInRange) {
                // Snap to target.min, whilst preserving the size of the range
                return {min, max: min + this.size(align)};
            } else {
                // Snap to target.max, whilst preserving the size of the range
                return {min: max - this.size(align), max};
            }
        } else if (minInRange && !canResize) {
            // Result of initial checks will resize the range, but this isn't allowed
            // Correct behaviour TBD. For time being, snap to the center of the target range
            const halfSize = this.size(align) / 2;
            const targetCenter = (target.min + target.max) / 2;
            return {min: targetCenter - halfSize, max: targetCenter + halfSize};
        }

        return {min, max};
    }
}
