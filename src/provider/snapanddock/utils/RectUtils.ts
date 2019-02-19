import {Rect} from 'hadouken-js-adapter/out/types/src/api/system/monitor';

import {Point, PointUtils} from './PointUtils';

export class MeasureResult implements Point {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public get length() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    public get lengthSquared() {
        return (this.x * this.x) + (this.y * this.y);
    }

    public get min() {
        return Math.min(this.x, this.y);
    }

    public get max() {
        return Math.max(this.x, this.y);
    }

    public get minAbs() {
        return Math.abs(this.x) <= Math.abs(this.y) ? this.x : this.y;
    }

    public get maxAbs() {
        return Math.abs(this.x) >= Math.abs(this.y) ? this.x : this.y;
    }

    public within(distance: number): boolean {
        return this.x < distance && this.y < distance;
    }

    public border(distance: number): boolean {
        return (Math.abs(this.x) <= distance && this.y <= distance) || (Math.abs(this.y) <= distance && this.x <= distance);
    }
}

/**
 * Defines the rectangle format used within snap and dock.
 *
 * This interface exists only to allow objects that contain these members to be passed directly to RectUtils. Do NOT
 * create short-lived Rectangle objects just for calling the utils - instead, use the four-argument versions of the
 * utils.
 */
export interface Rectangle {
    center: Point;
    halfSize: Point;
}

/**
 * A set of geometry utils for dealing with rectangles.
 *
 * Rectangles are represented as two Point variables, one stores the rectangles center-point, and the other the
 * half-size of the rectangle. This format was chosen as it simplifies the functions below, and these functions
 * will be heavily-used when moving/resizing windows.
 */
export class RectUtils {
    /**
     * Determines the distance between two rectangles, separately in each dimension.
     *
     * Negative values mean the rectangles are overlapping in that dimention, and 0 means they are touching edge-to-edge.
     */
    public static distance(rect1: Rectangle, rect2: Rectangle): MeasureResult {
        // Pull center/halfSize into variables, as they may be getters rather than variables
        const rect1Center = rect1.center, rect1HalfSize = rect1.halfSize;
        const rect2Center = rect2.center, rect2HalfSize = rect2.halfSize;

        // Distance between rectangles is the absolute difference between the rectangle centers and sum of half-sizes
        const distanceX = Math.abs(rect2Center.x - rect1Center.x) - (rect1HalfSize.x + rect2HalfSize.x);
        const distanceY = Math.abs(rect2Center.y - rect1Center.y) - (rect1HalfSize.y + rect2HalfSize.y);

        return new MeasureResult(distanceX, distanceY);
    }

    /**
     * Determines the distance between two rectangles, separately in each dimension. Input rectangles are specified
     * two Point instances, for the rectangles center and half-size.
     *
     * Negative values mean the rectangles are overlapping in that dimention, and 0 means they are touching edge-to-edge.
     */
    public static distanceFromParts(rect1Center: Point, rect1HalfSize: Point, rect2Center: Point, rect2HalfSize: Point): MeasureResult {
        // Distance between rectangles is the absolute difference between the rectangle centers and sum of half-sizes
        const distanceX = Math.abs(rect2Center.x - rect1Center.x) - (rect1HalfSize.x + rect2HalfSize.x);
        const distanceY = Math.abs(rect2Center.y - rect1Center.y) - (rect1HalfSize.y + rect2HalfSize.y);

        return new MeasureResult(distanceX, distanceY);
    }

    public static isPointInRect(center: Point, halfSize: Point, point: Point): boolean {
        return Math.abs(center.x - point.x) <= halfSize.x && Math.abs(center.y - point.y) < halfSize.y;
    }

    public static isEqual(rect1: Rectangle, rect2: Rectangle): boolean {
        return PointUtils.isEqual(rect1.center, rect2.center) && PointUtils.isEqual(rect1.halfSize, rect2.halfSize);
    }

    /**
     * Converts a rectangle from the {top,bottom,left,right} format used in the core to the {center, halfsize} format used in
     * the model.
     */
    public static convertToCenterHalfSize(rect: Rect): Rectangle {
        return {
            center: {x: (rect.right + rect.left) / 2, y: (rect.bottom + rect.top) / 2},
            halfSize: {x: (rect.right - rect.left) / 2, y: (rect.bottom - rect.top) / 2}
        };
    }

    public static overlappingArea(rect1: Rectangle, rect2: Rectangle): number {
        const overlap = PointUtils.scale(this.distanceFromParts(rect1.center, rect1.halfSize, rect2.center, rect2.halfSize), -1);

        return Math.max(0, overlap.x) * Math.max(0, overlap.y);
    }

    public static clone(rect: Rectangle): Rectangle {
        return {center: PointUtils.clone(rect.center), halfSize: PointUtils.clone(rect.halfSize)};
    }
}
