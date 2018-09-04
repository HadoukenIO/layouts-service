import {between, fail} from './index';
import {isSamePoint, Point, shiftPoint} from './point';
import {WindowIdentity} from './window';

export enum EdgeType {
  top = 'top',
  right = 'right',
  bottom = 'bottom',
  left = 'left'
}

export interface Edge<T = EdgeType> {
  type: T;
  start: Point;
  end: Point;
  windowId: WindowIdentity;
}

export function getOppositeSide(edge: EdgeType): EdgeType {
  switch (edge) {
    case EdgeType.bottom:
      return EdgeType.top;
    case EdgeType.top:
      return EdgeType.bottom;
    case EdgeType.left:
      return EdgeType.right;
    case EdgeType.right:
      return EdgeType.left;
    default:
      return fail('impossibleEdgetype');
  }
}

export function moveEdges(oldAnchor: Point, newAnchor: Point, edges: Edge[]) {
  const moveBy = {x: newAnchor.x - oldAnchor.x, y: newAnchor.y - oldAnchor.y};
  return edges.map(edge => {
    return shiftEdge(edge, moveBy);
  });
}

export function isVertical(edge: Edge) {
  return edge.start.x - edge.end.x === 0;
}

export function getLength(edge: Edge) {
  return isVertical(edge) ? edge.end.y - edge.start.y :
                            edge.end.x - edge.start.x;
}

export function edgeSubtraction(e1: Edge, e2: Edge): Edge[] {
  if (!isOverlapping(e1, e2)) {
    return [e1, e2];
  }
  const coord = getRelevantCoord(e1);
  const [firstStart, secondStart] =
      e1.start[coord] <= e2.start[coord] ? [e1, e2] : [e2, e1];
  const [firstEnd, secondEnd] =
      e1.end[coord] <= e2.end[coord] ? [e1, e2] : [e2, e1];
  return [
    sliceEdge(firstStart, firstStart.start[coord], secondStart.start[coord]),
    sliceEdge(secondEnd, firstEnd.end[coord], secondEnd.end[coord])
  ].filter((edge: Edge) => getLength(edge) > 0);
}

function sliceEdge(edge: Edge, start: number, end: number) {
  const coord = getRelevantCoord(edge);
  return {
    ...edge,
    start: {...edge.start, [coord]: start},
    end: {...edge.end, [coord]: end}
  };
}
function getRelevantCoord(edge: Edge) {
  return isVertical(edge) ? 'y' : 'x';
}

export function abuts(e1: Edge, e2: Edge) {
  return isSamePoint(e1.start, e2.start) || isSamePoint(e1.start, e2.end) ||
      isSamePoint(e1.end, e2.start) || isSamePoint(e1.end, e2.start);
}
export const isSameEdge = (edge1: Edge, edge2: Edge): boolean => {
  return isSamePoint(edge1.start, edge2.start) &&
      isSamePoint(edge1.end, edge2.end) && edge1.type === edge2.type;
};
export function makeCorresponds(e1: Edge) {
  const isVert = isVertical(e1);
  return (e2: Edge) =>
             e1.type === getOppositeSide(e2.type) && isOverlapping(e1, e2);
}
export function isOverlapping(e1: Edge, e2: Edge) {
  const isVert = isVertical(e1);
  const mightOverlap = isVertical(e2) === isVert;
  return mightOverlap &&
      (isVert ? e1.start.x === e2.start.x &&
               ((e1.start.y < e2.end.y && e1.start.y >= e2.start.y) ||
                (e2.start.y < e1.end.y && e2.start.y >= e1.start.y)) :
                e1.start.y === e2.start.y &&
               ((e1.start.x < e2.end.x && e1.start.x >= e2.start.x) ||
                (e2.start.x < e1.end.x && e2.start.x >= e1.start.x)));
}
export function shiftEdge<T>(edge: Edge<T>, moveBy: Point): Edge<T> {
  return {
    ...edge,
    start: shiftPoint(edge.start, moveBy),
    end: shiftPoint(edge.end, moveBy)
  };
}
export function intersects(e1: Edge, e2: Edge) {
  // Returns true if an edge crosses another, but not if it starts along the
  // other.
  const [vert, hor] = isVertical(e1) ? [e1, e2] : [e2, e1];
  if (isVertical(hor) || !isVertical(vert)) {
    return false;
  }
  return between(vert.start.y, vert.end.y, hor.start.y) &&
      between(hor.start.x, hor.end.x, vert.start.x);
}