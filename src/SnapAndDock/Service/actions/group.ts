import {Fin, OfWindow} from '../../fin';
import {GroupSnappingData, SnapPointData, WindowSnappingData} from '../../types';
import {addWindowToGroup, createGroup, deleteGroup, setGroupId} from '../state/stateChanges';
import {getGroup, getWindow, updateWindowState} from '../state/store';
import {p} from '../utils/async';
import {mergeEdges, recalculateGroupBounds} from '../utils/group';
import {WindowIdentity} from '../utils/window';
import {leaveGroup} from './ungroup';
import {updateWindowOptionsForUngroup} from './ungroup';
declare var fin: Fin;

export async function createNewGroup(
    identity: WindowIdentity, snapPointData: SnapPointData&WindowSnappingData) {
  const {snapPoint, id, snapEdges} = snapPointData;
  const snapToWindow = getWindow(id);
  const window = getWindow(identity);
  const groupWindows = [id, identity];
  // amend group edges
  const groupEdges = mergeEdges(snapToWindow.edges, window.edges);
  createGroup({windows: groupWindows, edges: groupEdges});

  await updateWindowOptionsForGroup(id);
  updateWindowOptionsForGroup(identity);
}


export function addToGroup(
    identity: WindowIdentity, snapPointData: SnapPointData&GroupSnappingData) {
  const {id} = snapPointData;
  addWindowToGroup(identity, id);
  updateWindowOptionsForGroup(identity);
  // create group if doesnt exist
  // find bounds to alter
  // add all other unaltered window bounds
}


async function updateWindowOptionsForGroup(identity: WindowIdentity) {
  // save options then update options
  const ofWin = fin.desktop.Window.wrap(identity.uuid, identity.name);
  // tslint:disable-next-line:no-any
  const initialOptions = await p<any>(ofWin.getOptions.bind(ofWin))();
  updateWindowState(identity, () => ({initialOptions}));
  const focusListener = (payload: WindowIdentity) => {
    const win = getWindow(payload);
    const group = win.groupId && getGroup(win.groupId);
    if (group) {
      group.windows.forEach(w => {
        fin.desktop.Window.wrap(w.uuid, w.name).bringToFront();
      });
    }
  };
  ofWin.addEventListener('focused', focusListener);

  // Call this on undock
  const undockFn = () => {
    ofWin.removeEventListener('focused', focusListener);
    updateWindowOptionsForUngroup(ofWin, initialOptions);
  };
  updateWindowState(identity, () => ({undockFn}));
  updateWindowOptionsForGrouping(ofWin);
}

export function updateWindowOptionsForGrouping(ofWin: OfWindow) {
  ofWin.updateOptions({resizable: false});
}

export async function groupFromWindows(windows: WindowIdentity[]) {
  const newGroups = recalculateGroupBounds(windows);
  console.log(newGroups);
  await Promise.all(newGroups.map(async ({windows, edges}) => {
    if (windows.length > 1) {
      createGroup({windows, edges});
      const anchorId = windows[0];
      const anchor = fin.desktop.Window.wrap(anchorId.uuid, anchorId.name);
      await Promise.all(windows.slice(1).map(id => {
        const ofWin = fin.desktop.Window.wrap(id.uuid, id.name);
        //@ts-ignore
        return p<OfWindow, void>(ofWin.joinGroup.bind(ofWin))(anchor);
      }));
      return;
    } else {
      setGroupId(windows[0], null);
      const window = getWindow(windows[0]);
      if (typeof window.undockFn === 'function') {
        window.undockFn();
      }
      return;
    }
  }));
}

export async function remakeGroup(groupId: number) {
  const oldGroup = deleteGroup(groupId);
  console.log(oldGroup);
  await Promise.all(oldGroup.windows.map(leaveGroup));
  console.log('left old group');
  await groupFromWindows(oldGroup.windows);
}
