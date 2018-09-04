import {Fin} from '../../fin';
import {WindowStateMember} from '../state/store';

import {Edge, EdgeType} from './edge';
import {Point} from './point';

declare var fin: Fin;

export type WindowStats = WindowIdentity&RawBounds;
export interface WindowIdentity {
  uuid: string;
  name: string;
}


export interface Corners {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type WindowEdges = [
  Edge<EdgeType.top>, Edge<EdgeType.right>, Edge<EdgeType.bottom>,
  Edge<EdgeType.left>
];

export interface RawBounds {
  height: number;
  width: number;
  top: number;
  left: number;
  right?: number;
  changeType?: number;
  bottom?: number;
}
export interface Bounds extends RawBounds {
  right: number;
  bottom: number;
}

export const getTopLeftPoint = (win: WindowStateMember): Point => {
  return win.edges[0].start;
};

export function wrapWindow(identity: WindowIdentity) {
  return fin.desktop.Window.wrap(identity.uuid, identity.name);
}

export function edgesFromBounds(bounds: Corners, identity: WindowIdentity) {
  const {left, right, top, bottom} = bounds;
  const edges: WindowEdges = [
    {
      type: EdgeType.top,
      start: {x: left, y: top},
      end: {x: right, y: top},
      windowId: identity
    },
    {
      type: EdgeType.right,
      start: {x: right, y: top},
      end: {x: right, y: bottom},
      windowId: identity
    },
    {
      type: EdgeType.bottom,
      start: {x: left, y: bottom},
      end: {x: right, y: bottom},
      windowId: identity
    },
    {
      type: EdgeType.left,
      start: {x: left, y: top},
      end: {x: left, y: bottom},
      windowId: identity
    },
  ];
  return edges;
}

export function windowEventToIgnore(
    bounds: Bounds&WindowIdentity, window: WindowStateMember) {
  if (window.deregistered || window.hidden || window.state !== 'normal' ||
      window.synthMove) {
    return true;
  }
  return false;
}