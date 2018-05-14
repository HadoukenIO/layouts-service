import {Fin, MonitorState, OfWindow} from '../fin';

import {initWindow} from '.';
import {handleBoundsChanging} from './actions/boundsChanging';
import {remakeGroup} from './actions/group';
import {monitorChanged} from './actions/monitorChanged';
import {handleBoundsChanged} from './actions/onBoundsChanged';
import {unGroup} from './actions/ungroup';
import {handleWindowClosed} from './actions/windowStatusChange';
import {normalizeBounds} from './config';
import {getCurrentEvent, setEventHandling} from './state/event';
import {removeWindowFromGroup, saveBoundsToWindowState} from './state/stateChanges';
import {alreadyInMap, getWindow, GroupStateMember, updateWindowState} from './state/store';
import {AppIdentity} from './utils';
import {p} from './utils/async';
import {Bounds, RawBounds, WindowIdentity, WindowStats} from './utils/window';

declare var fin: Fin;


export async function registerWindowListeners(
    identity: WindowIdentity, bounds?: RawBounds) {
  // Always register listeners before storing bounds for the first time
  const window = fin.desktop.Window.wrap(identity.uuid, identity.name);
  window.addEventListener('bounds-changed', (payload: WindowStats) => {
    const frame = getWindow(identity).frame;
    handleBoundsChanged(normalizeBounds(payload, frame));
  });
  window.addEventListener('frame-disabled', () => {
    updateWindowState(identity, () => ({frame: false}));
    window.getBounds(
        payload =>
            saveBoundsToWindowState(window, normalizeBounds(payload, false)));
  });
  window.addEventListener('frame-enabled', () => {
    updateWindowState(identity, () => ({frame: true}));
    window.getBounds(
        payload =>
            saveBoundsToWindowState(window, normalizeBounds(payload, true)));
  });
  window.addEventListener(
      'maximized',
      () => updateWindowState(identity, () => ({state: 'maximized'})));
  window.addEventListener(
      'minimized',
      () => updateWindowState(identity, () => ({state: 'minimized'})));
  window.addEventListener('maximized', () => unGroup(identity));
  window.addEventListener('minimized', () => unGroup(identity));
  window.addEventListener(
      'restored', () => updateWindowState(identity, () => ({state: 'normal'})));
  window.addEventListener('hidden', () => {
    updateWindowState(identity, () => ({hidden: true}));
    const groupId = getWindow(identity).groupId;
    if (groupId) {
      removeWindowFromGroup(identity);
      remakeGroup(groupId);
    }
  });
  window.addEventListener(
      'shown', () => updateWindowState(identity, () => ({hidden: false})));
  window.addEventListener('closed', win => handleWindowClosed(win));
  /* tslint:disable-next-line */
  window.addEventListener('bounds-changing', async (payload: WindowStats) => {
    if (!getCurrentEvent().handling) {
      setEventHandling(true);
      const frame = getWindow(identity).frame;
      await handleBoundsChanging(normalizeBounds(payload, frame));
      setEventHandling(false);
    }
  });
}

// does this need to be awaited?
export async function registerInitListeners() {
  // Whenever a new app is created, initialize main window and listen for new
  // window creation
  const listener = async (payload: WindowIdentity) => {
    const {uuid} = payload;
    await registerAppListeners(uuid);
    const app = fin.desktop.Application.wrap(uuid);
    const main = app.getWindow();
    const children = await p<OfWindow[]>(app.getChildWindows.bind(app))();
    await Promise.all([...children, main].map(async win => {
      const bounds = await p<Bounds>(win.getBounds.bind(win))();
      initWindow(win, bounds);
    }));
  };
  await p<string, (info: MonitorState) => void, void>(
      fin.desktop.System.addEventListener)(
      'monitor-info-changed', monitorChanged);
  await p<string, (id: WindowIdentity) => void, void>(
      fin.desktop.System.addEventListener)('application-created', listener);
  fin.desktop.System.getAllApplications((apps: AppIdentity[]) => {
    apps.forEach(app => {
      registerAppListeners(app.uuid);
    });
  });
}

export async function registerAppListeners(uuid: string) {
  if (uuid === fin.desktop.Application.getCurrent().uuid) {
    return;
  }
  const ofApp = fin.desktop.Application.wrap(uuid);
  // created or started?
  await p<string, (id: WindowIdentity) => void, void>(
      ofApp.addEventListener.bind(ofApp))(
      'window-created', (payload: WindowIdentity) => {
        const {uuid, name} = payload;
        fin.desktop.Window.wrap(uuid, name)
            .getBounds((bounds: Bounds) => initWindow(payload, bounds));
      });
}