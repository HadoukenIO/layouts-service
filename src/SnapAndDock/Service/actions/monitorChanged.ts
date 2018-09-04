import {MonitorState} from '../../fin';
import {getMonitorState, updateMonitorState} from '../state/monitor';
import {getAllGroups, getWindow, GroupStateMember, GroupStateWithId} from '../state/store';
import {p, promiseMap} from '../utils/async';
import {isSameEdge} from '../utils/edge';
import {findDifference, Point, shiftPoint} from '../utils/point';
import {canFitIn, getBoundingRectangle, getCenter, isContainedIn, isSameRectangle} from '../utils/rectangles';
import {WindowIdentity, wrapWindow} from '../utils/window';

import {groupFromWindows} from './group';
import {moveWindowTo} from './moveWindow';
import {disbandGroup} from './ungroup';

export async function monitorChanged(monitorState: MonitorState) {
  const old = getMonitorState();
  console.log(monitorState);
  if (!isSameRectangle(old.virtualScreen, monitorState.virtualScreen)) {
    updateMonitorState(() => monitorState);
    const groupsToHandle = getAllGroups().filter(group => {
      const boundingRect = getBoundingRectangle(group.edges);
      return !isContainedIn(boundingRect, monitorState.virtualScreen);
    });
    await promiseMap(groupsToHandle, handleOutOfBoundsGroup);
  }
}

async function handleOutOfBoundsGroup(group: GroupStateWithId) {
  await disbandGroup(group.id);
}

function hideWindow(win: WindowIdentity) {
  const ofWin = wrapWindow(win);
  return p<void>(ofWin.hide.bind(ofWin))();
}
function showWindow(win: WindowIdentity) {
  const ofWin = wrapWindow(win);
  return p<void>(ofWin.show.bind(ofWin))();
}
