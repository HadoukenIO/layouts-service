export interface Point<T = number> {
    x: T;
    y: T;
}

export class PointUtils {
    public static isEqual(point1: Point, point2: Point): boolean {
        return point1.x === point2.x && point1.y === point2.y;
    }

    public static assign(lhs: Point, rhs: Point): Point {
        lhs.x = rhs.x;
        lhs.y = rhs.y;

        return lhs;
    }

    public static clone(point: Point): Point {
        return {x: point.x, y: point.y};
    }

    // tslint:disable-next-line:no-any
    public static isPoint(value: any): value is Point {
        return value.x !== undefined && value.y !== undefined;
    }

    public static lengthSquared(p: Point): number {
        return Math.sqrt((p.x * p.x) + (p.y * p.y));
    }

    /**
     * Calculates the vector difference between two points
     */
    public static difference(p1: Point, p2: Point): Point {
        return {x: p2.x - p1.x, y: p2.y - p1.y};
    }

    /**
     * Scales the magnitude of the point (as a vector) by the specified amount
     * @param point Point to be scaled
     * @param scale Value to scale the vector by.
     */
    public static scale(point: Point, scale: number): Point {
        return {x: point.x * scale, y: point.y * scale};
    }
}
