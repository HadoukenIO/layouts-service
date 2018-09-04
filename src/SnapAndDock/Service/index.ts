import {Fin, MonitorState} from '../fin';

import {undockWindow} from './actions/ungroup';
import {deregisterWindow} from './actions/windowStatusChange';
import {normalizeBounds} from './config';
import {registerInitListeners, registerWindowListeners} from './listeners';
import {updateMonitorState} from './state/monitor';
import {addWindow, alreadyInMap} from './state/store';
import {p, promiseMap} from './utils/async';
import {Bounds, edgesFromBounds, RawBounds, WindowIdentity, WindowStats} from './utils/window';

type specs = {
  name: string
};


declare var fin: Fin;

// tricking ts here, promise will be awaited first thing in init, so this
// shouldn't actually be this value by the time we use it
let win10 = false;
const win10Check = p<specs>(fin.desktop.System.getHostSpecs)().then(specs => {
  win10 = specs.name.includes('Windows 10');
});

export function isWin10() {
  return win10;
}

async function initMonitorState() {
  const state = await p<MonitorState>(fin.desktop.System.getMonitorInfo)();
  updateMonitorState(() => state);
}

async function init() {
  await win10Check;
  await initMonitorState();
  await registerInitListeners();
  const apps = await p<Array<
      {uuid: string, mainWindow: WindowStats, childWindows: WindowStats[]}>>(
      fin.desktop.System.getAllWindows)();
  // CHECK FOR GROUPED WINDOWS
  await promiseMap(apps, async (app, idx, arr) => {
    const {uuid, mainWindow, childWindows} = app;
    await initWindow({uuid, name: mainWindow.name}, mainWindow as Bounds);
    await promiseMap(childWindows, async (win: WindowStats) => {
      await initWindow({uuid, name: win.name}, win);
    });
  });

  return await registerService();
}

async function registerService() {
  const providerChannel = await fin.desktop.Service.register();
  providerChannel.register('undock', undockWindow);
  providerChannel.register('deregister', deregisterWindow);

  return providerChannel;
}


async function createWindowState(identity: WindowIdentity, bounds: RawBounds) {
  const ofWin = fin.desktop.Window.wrap(identity.uuid, identity.name);
  // tslint:disable-next-line:no-any
  const opts = await p<any>(ofWin.getOptions.bind(ofWin))();
  const {frame, state} = opts;
  const hidden = !await p<boolean>(ofWin.isShowing.bind(ofWin))();

  const edges = edgesFromBounds(normalizeBounds(bounds, frame), identity);
  addWindow(identity, {
    state,
    hidden,
    frame,
    edges,
    identity,
    synthMove: false,
    groupId: null,
    deregistered: false,
  });
}

export async function initWindow(identity: WindowIdentity, bounds: RawBounds) {
  if (!alreadyInMap(identity)) {
    console.log('initializing identity', identity);
    if (identity.uuid === fin.desktop.Application.getCurrent().uuid) {
      return;
    }
    await createWindowState(identity, bounds);
    await registerWindowListeners(identity, bounds);
  }
}



export function main() {
  //@ts-ignore
  return init();
}