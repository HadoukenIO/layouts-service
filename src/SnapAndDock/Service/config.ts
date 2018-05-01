import {isWin10} from '.';
import {Edge, EdgeType} from './utils/edge';
import {Bounds, RawBounds} from './utils/window';

export const sensitivity = 20;

export function isSnappableEdge(edge: Edge) {
  // later make work based on snap points
  return edge.type === EdgeType.bottom || edge.type === EdgeType.right;
}

export const PREVIEW_FADE_IN = 100;
export const MOVE_DURATION = 100;
export const PREVIEW_ERROR_FADE_OUT = 100;
export const SNAP_TO_OPACITY = 0.95;
export const SNAP_PREVIEW_OPACITY = 0.5;
export const DRAG_OPACITY = 0.7;

export const PREVIEW_SUCCESS = '#3D4059';
export const PREVIEW_FAILURE =
    `repeating-linear-gradient(45deg, #3D4059, #3D4059 .25em, #C24629 0, #C24629 .5em)`;

export function normalizeBounds<T extends RawBounds>(
    bounds: T, frame: boolean): T&Bounds {
  bounds.right = bounds.right || bounds.left + bounds.width;
  bounds.bottom = bounds.bottom || bounds.top + bounds.height;
  const {left, right, top, bottom} = bounds;
  if (isWin10() && frame) {
    return {
      //@ts-ignore
      ...bounds,
      left: left + 7,
      right: right - 7,
      bottom: bottom - 7,
      top,
      height: bounds.height - 7,
      width: bounds.width - 14
    };
  } else {
    //@ts-ignore
    return {...bounds, left, right, top, bottom};
  }
}