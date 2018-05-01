import {GroupId} from '../../types';
import {getCurrentEvent} from '../state/event';
import {saveBoundsToWindowState} from '../state/stateChanges';
import {getAllGroups, getAllWindows, getGroup, getWindow, updateGroupState, updateWindowState} from '../state/store';
import {getWindowIdentity, identityMatch} from '../utils';
import {moveEdges} from '../utils/edge';
import {willCollideOnSnap} from '../utils/group';
import {Bounds, getTopLeftPoint, windowEventToIgnore, WindowIdentity} from '../utils/window';

import {endBoundsChanging} from './boundsChanging';
import {remakeGroup} from './group';
import {shouldSnapTo} from './shouldSnap';
import {snapAndGroup} from './snap';


export async function handleBoundsChanged(payload: Bounds&WindowIdentity) {
  const now = new Date();
  console.groupCollapsed(`bounds changed ${payload.uuid}/${payload.name} ${
      now.toTimeString()} ${now.getMilliseconds()}`);
  const identity = getWindowIdentity(payload);
  try {
    const window = getWindow(identity);

    if (windowEventToIgnore(payload, window) || getCurrentEvent().synthMove) {
      saveBoundsToWindowState(identity, payload);
      endBoundsChanging(identity, true);
      console.log('Bounds saved but snap and dock logic skipped...', payload);
      console.groupEnd();
      return;
    }
    console.log('state before');
    console.dir(getAllGroups());
    console.dir(getAllWindows());
    // if part of a group
    if (window.groupId) {
      await handleGroupBoundsChanged(window.groupId, payload);
      saveBoundsToWindowState(identity, payload);
      console.log('window in group, not snapping. Updated window state to:');
      console.log(getWindow(identity));
      console.groupEnd();
      return;
    }
  } catch (e) {
  }

  saveBoundsToWindowState(identity, payload);
  const snapPoint = shouldSnapTo(identity, payload);
  // filter out a group if there will be a collision
  const filteredSnapPoint =
      snapPoint && !willCollideOnSnap(snapPoint, payload) ? snapPoint : false;
  const logging = filteredSnapPoint || console.log('not snapping');
  const ret =
      filteredSnapPoint ? snapAndGroup(identity, filteredSnapPoint) : null;
  console.log('state after');
  console.dir(getAllGroups());
  console.dir(getAllWindows());
  console.groupEnd();

  // opacity back to 1 / end the event
  await endBoundsChanging(identity, !!filteredSnapPoint);
  return ret;
}

export async function handleGroupBoundsChanged(
    groupId: GroupId, payload: Bounds&WindowIdentity) {
  const group = getGroup(groupId);
  const identity = getWindowIdentity(payload);
  if (payload.changeType !== 0) {
    console.log('payload not 0, remaking group.');
    setTimeout(() => remakeGroup(groupId), 300);
    return;
  }
  // Only the first window in the array causes a group window move;
  if (identityMatch(group.windows[0], identity)) {
    console.log('handling bounds changed for ', groupId);
    // TBD: decide on snap
    // update group state
    const window = getWindow(identity);
    const oldAnchor = getTopLeftPoint(window);
    const newAnchor = {x: payload.left, y: payload.top};
    updateGroupState(
        groupId,
        group =>
            ({...group, edges: moveEdges(oldAnchor, newAnchor, group.edges)}));
  }
}