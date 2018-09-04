import {GroupId} from '../../types';
import {Point} from '../utils/point';
import {Edge, EdgeType} from './../utils/edge';
import {Bounds, WindowEdges, WindowIdentity} from './../utils/window';

export interface WindowStateMember {
  identity: WindowIdentity;
  edges: WindowEdges;
  synthMove: boolean;
  groupId: GroupId|null;
  // tslint:disable-next-line:no-any
  frame: boolean;
  state: string;
  hidden: boolean;
  initialOptions?: InitialOptions;
  deregistered?: boolean;
  undockFn?: () => void;
}
export interface InitialOptions {
  maxWidth: number;
  minWidth: number;
  maxHeight: number;
  minHeight: number;
  maximizable: boolean;
  minimizable: boolean;
  resizable: boolean;
}
export interface GroupStateMember {
  edges: Edge[];
  windows: WindowIdentity[];
}

export interface GroupStateWithId extends GroupStateMember { id: GroupId; }


export type WindowState = Map<string, WindowStateMember>;

export type GroupState = Map<GroupId, GroupStateMember>;

const groupState: GroupState = new Map();
const windowState: WindowState = new Map();
let groupId = 1;



function getWindowKey(identity: WindowIdentity) {
  return `${identity.uuid}/${identity.name}`;
}

export function clone<T>(x: {}) {
  return {...x} as T;
}

export type Updater<T> = (oldState: T) => Partial<T>;

export type Partial<T> = {
  [P in keyof T]?: T[P]
};

export function updateGroupState(
    id: GroupId, update: Updater<GroupStateMember>) {
  const v = groupState.get(id);
  if (v) {
    const updated = {...v, ...update(clone(v))};
    groupState.set(id, updated);
    return updated;
  } else {
    throw new Error('cannot update group - does not exist');
  }
}

export function updateWindowState(
    id: WindowIdentity, update: Updater<WindowStateMember>) {
  const key = getWindowKey(id);
  const v = windowState.get(key);
  if (v) {
    const updated = {...v, ...update(clone(v))};
    windowState.set(key, updated);
    return updated;
  } else {
    throw new Error('cannot update window - does not exist');
  }
}

export function alreadyInMap(id: WindowIdentity) {
  return windowState.has(getWindowKey(id));
}

export function createGroupState(group: GroupStateMember) {
  const id = groupId++;
  groupState.set(id, group);
  return id;
}

export function deleteGroupStateMember(id: GroupId) {
  return groupState.delete(id);
}

export function deleteWindowStateMember(id: WindowIdentity) {
  return windowState.delete(getWindowKey(id));
}

export function addWindow(identity: WindowIdentity, state: WindowStateMember) {
  if (alreadyInMap(identity)) {
    throw new Error('window already exists');
  }
  windowState.set(getWindowKey(identity), state);
}

export function getGroup(id: GroupId) {
  const ret = groupState.get(id);
  if (!ret) {
    throw new Error(`group ${id} does not exist`);
  }
  return ret;
}

export function getWindow(id: WindowIdentity) {
  const ret = windowState.get(getWindowKey(id));
  if (!ret) {
    console.warn(id);
    throw new Error(`Window ${JSON.stringify(id)} does not exist`);
  }
  return ret;
}

export function getAllWindows(): WindowStateMember[] {
  const ret = [] as WindowStateMember[];
  windowState.forEach(win => ret.push({...win}));
  return ret;
}

export function getAllGroups() {
  const ret = [] as GroupStateWithId[];
  groupState.forEach((group, id) => ret.push({...group, id}));
  return ret;
}
