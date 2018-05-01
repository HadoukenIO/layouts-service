import {Fin, OfWindow} from '../../fin';
import {GroupId} from '../../types';
import {sensitivity} from '../config';
import {deleteGroup, removeWindowFromGroup} from '../state/stateChanges';
import {getWindow, InitialOptions} from '../state/store';
import {p, promiseMap} from '../utils/async';
import {getTopLeftPoint, WindowIdentity} from '../utils/window';

import {remakeGroup} from './group';
import {moveWindowTo} from './moveWindow';


declare var fin: Fin;
export async function leaveGroup(identity: WindowIdentity) {
  const win = fin.desktop.Window.wrap(identity.uuid, identity.name);
  return p<void>(win.leaveGroup.bind(win))();
}

export async function unGroup(target: WindowIdentity) {
  const window = getWindow(target);
  if (!window.groupId) {
    throw new Error(`Window '${target.uuid} / ${target.name}' not grouped`);
  }
  removeWindowFromGroup(target);
  await remakeGroup(window.groupId);
  // set ignoreNextMoveForSnapping
  await leaveGroup(target);
  if (typeof window.undockFn === 'function') {
    window.undockFn();
  }
}

export async function disbandGroup(id: GroupId) {
  const {windows} = deleteGroup(id);
  await promiseMap(windows, leaveGroup);
}

export async function undockWindow(target: WindowIdentity) {
  const window = getWindow(target);
  await unGroup(target);
  const moveTo = getTopLeftPoint(window);
  moveTo.x += sensitivity * 2;
  moveTo.y += sensitivity * 2;

  await moveWindowTo(target, moveTo);

  return `Window '${target.uuid} / ${target.name}' undocked`;
}

export function updateWindowOptionsForUngroup(
    ofWin: OfWindow, options: InitialOptions) {
  ofWin.updateOptions({resizable: options.resizable});
}