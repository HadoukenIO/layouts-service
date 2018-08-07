import {Direction, Orientation} from '../Resolver';

import {Rectangle} from './RectUtils';

/**
 * Small interface representing a one-dimensional span.
 */
export interface Range {
    min: number;
    max: number;
}

export class RangeUtils {
    public static size(range: Range): number {
        return range.max - range.min;
    }

    public static equal(range1: Range, range2: Range): boolean {
        return range1.min === range2.min && range1.max === range2.max;
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
