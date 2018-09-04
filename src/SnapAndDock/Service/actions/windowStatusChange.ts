import {deleteWindow} from '../state/stateChanges';
import {getWindow, updateWindowState} from '../state/store';
import {WindowIdentity} from '../utils/window';

import {remakeGroup} from './group';
import {undockWindow} from './ungroup';

export async function deregisterWindow(target: WindowIdentity) {
  try {
    await undockWindow(target);
  } catch (e) {
  }
  const window = getWindow(target);
  if (!window) {
    return `Window not found`;
  }
  updateWindowState(target, () => ({deregistered: true}));
  return `Window '${target.uuid} / ${target.name}' deregistered`;
}

export async function handleWindowClosed(payload: WindowIdentity) {
  console.groupCollapsed('close window ' + payload.name);
  const window = getWindow(payload);
  deleteWindow(payload);
  if (window.groupId) {
    remakeGroup(window.groupId);
  }
  console.groupEnd();
}
