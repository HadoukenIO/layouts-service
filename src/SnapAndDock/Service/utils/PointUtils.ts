
export interface Point<T = number> {
    x: T;
    y: T;
}

export class PointUtils {
    static isEqual(point1: Point, point2: Point): boolean {
        return point1.x === point2.x && point1.y === point2.y;
    }

    static assign(lhs: Point, rhs: Point): Point {
        lhs.x = rhs.x;
        lhs.y = rhs.y;

        return lhs;
    }

    // tslint:disable-next-line:no-any
    static isPoint(value: any): value is Point {
        return value.x !== undefined && value.y !== undefined;
    }
}
