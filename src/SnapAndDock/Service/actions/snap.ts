import {Fin, OfWindow} from '../../fin';
import {Entity, SnapPointData} from '../../types';
import {getGroup} from '../state/store';
import {p} from '../utils/async';
import {WindowIdentity} from '../utils/window';

import {addToGroup, createNewGroup} from './group';
import {moveWindowTo} from './moveWindow';

declare var fin: Fin;
export async function snapAndGroup(
    identity: WindowIdentity, snapPointData: SnapPointData) {
  // TBD:  improve error handling;
  const ofWin: OfWindow = fin.desktop.Window.wrap(identity.uuid, identity.name);
  const {snapPoint, id} = snapPointData;
  // move window to snapping point
  await moveWindowTo(identity, snapPoint);
  if (snapPointData.entity === Entity.Window) {
    const {snapPoint, id} = snapPointData;
    const snapToOfWindow = fin.desktop.Window.wrap(id.uuid, id.name);
    await p<OfWindow, void>(ofWin.joinGroup.bind(ofWin))(snapToOfWindow);
    createNewGroup(identity, snapPointData);
    // createNewGroup
  } else if (snapPointData.entity === Entity.Group) {
    const {snapPoint, id} = snapPointData;
    const snapToGroup = getGroup(id);
    const {uuid, name} = snapToGroup.windows[0];
    const snapToOfWindow = fin.desktop.Window.wrap(uuid, name);
    await p<OfWindow, void>(ofWin.joinGroup.bind(ofWin))(snapToOfWindow);
    addToGroup(identity, snapPointData);
  }
  console.groupEnd();
}