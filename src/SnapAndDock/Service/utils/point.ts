import {sensitivity} from '../config';

import {Edge, EdgeType, isVertical} from './edge';

export interface Point {
  x: number;
  y: number;
}

export const isSamePoint = (pt1: Point, pt2: Point): boolean => {
  return pt1.x === pt2.x && pt1.y === pt2.y;
};
export const shiftPoint = (point: Point, moveBy: Point): Point => {
  return {x: point.x + moveBy.x, y: point.y + moveBy.y};
};

export const findDifference = (from: Point, to: Point) =>
    ({x: from.x - to.x, y: from.y - to.y});

export function createInsideSnapRegion(point: Point) {
  return (edge: Edge) => {
    if (isVertical(edge)) {
      // edge is vertical
      return Math.abs(point.x - edge.start.x) <= sensitivity &&
          (point.y >= (edge.start.y - sensitivity * 3) &&
           point.y <= edge.end.y - sensitivity * 3);
    } else {
      return Math.abs(point.y - edge.start.y) <= sensitivity &&
          (point.x >= (edge.start.x - sensitivity * 3) &&
           point.x <= edge.end.x - sensitivity * 3);
    }
  };
}