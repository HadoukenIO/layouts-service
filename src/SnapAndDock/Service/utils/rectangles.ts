import {fail} from '.';
import {Edge, EdgeType} from './edge';
import {Corners} from './window';

export function isSameRectangle(a: Corners, b: Corners): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom &&
      a.left === b.left;
}

export function getBoundingRectangle(edges: Edge[]) {
  return edges.reduce((bounds, edge) => {
    const t = edge.type;
    const compare =
        (t === EdgeType.top || t === EdgeType.left) ? Math.min : Math.max;
    const coord = (t === EdgeType.top || t === EdgeType.bottom) ? 'y' : 'x';
    return {...bounds, [t]: compare(bounds[t], edge.start[coord])};
  }, {top: Infinity, bottom: -Infinity, right: -Infinity, left: Infinity});
}

export function isContainedIn(maybeSmaller: Corners, container: Corners) {
  return [EdgeType.top, EdgeType.bottom, EdgeType.left, EdgeType.right].every(
      t => (t === EdgeType.top || t === EdgeType.left) ?
          container[t] <= maybeSmaller[t] :
          maybeSmaller[t] <= container[t]);
}

const findHeight = (rect: Corners) => rect.bottom - rect.top;
const findWidth = (rect: Corners) => rect.bottom - rect.top;

export function canFitIn(maybeSmaller: Corners, container: Corners) {
  return findHeight(maybeSmaller) <= findHeight(container) &&
      findWidth(maybeSmaller) <= findWidth(container);
}

export const intAverage = (a: number, b: number) => Math.floor((a + b) / 2);

export function getCenter({top, bottom, left, right}: Corners) {
  return {y: intAverage(top, bottom), x: intAverage(left, right)};
}