import {GroupId} from '../../types';

import {identityMatch} from './../utils';
import {Edge, EdgeType} from './../utils/edge';
import {mergeEdges} from './../utils/group';
import {Corners, edgesFromBounds, WindowIdentity} from './../utils/window';
import {createGroupState, deleteGroupStateMember, deleteWindowStateMember, getGroup, getWindow, GroupStateMember, InitialOptions, updateGroupState, updateWindowState, WindowStateMember} from './store';

export function deleteGroup(id: GroupId): GroupStateMember {
  const state = getGroup(id);
  if (state) {
    deleteGroupStateMember(id);
    state.windows.forEach(id => updateWindowState(id, () => ({groupId: null})));
    return state;
  }
  throw new Error(`group ${id} does not exist`);
}

export function deleteWindow(id: WindowIdentity): WindowStateMember {
  const win = getWindow(id);
  if (win) {
    deleteWindowStateMember(id);
    if (win.groupId) {
      updateGroupState(
          win.groupId, (group) => ({
                         windows: group.windows.filter(
                             id => !identityMatch(id, win.identity))
                       }));
    }
    return win;
  }
  throw new Error(`window ${id.name} does not exist`);
}

export function removeWindowFromGroup(id: WindowIdentity): WindowStateMember {
  const win = getWindow(id);
  if (win) {
    updateWindowState(id, () => ({groupId: null}));
    if (win.groupId) {
      updateGroupState(
          win.groupId, (group) => ({
                         windows: group.windows.filter(
                             id => !identityMatch(id, win.identity))
                       }));
    }
    return win;
  }
  throw new Error(`window ${id.name} does not exist`);
}



export function addWindowToGroup(winId: WindowIdentity, groupId: GroupId) {
  const win = updateWindowState(winId, () => ({groupId}));
  return updateGroupState(groupId, (prev) => ({
                                     edges: mergeEdges(prev.edges, win.edges),
                                     windows: [...prev.windows, winId]
                                   }));
}

export function setGroupId(windowId: WindowIdentity, groupId: GroupId|null) {
  return updateWindowState(windowId, () => ({groupId}));
}

export function createGroup(group: GroupStateMember) {
  const id = createGroupState(group);
  group.windows.map(win => updateWindowState(win, state => ({groupId: id})));
}

export function saveBoundsToWindowState(
    identity: WindowIdentity, bounds: Corners) {
  const edges = edgesFromBounds(bounds, identity);
  updateWindowState(identity, (state) => ({...state, edges}));
}
