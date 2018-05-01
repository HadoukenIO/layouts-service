import {isWin10} from '..';
import {Fin, OfWindow} from '../../fin';
import {MOVE_DURATION} from '../config';
import {getWindow, updateWindowState} from '../state/store';
import {p} from '../utils/async';
import {moveEdges} from '../utils/edge';
import {Point} from '../utils/point';
import {getTopLeftPoint, WindowEdges, WindowIdentity} from '../utils/window';

declare var fin: Fin;

export async function moveWindowTo(
    id: WindowIdentity, to: Point, duration = MOVE_DURATION) {
  const win = updateWindowState(id, () => ({synthMove: true}));
  const ofWin: OfWindow = fin.desktop.Window.wrap(id.uuid, id.name);
  const x = (isWin10() && win.frame) ? to.x - 7 : to.x;
  const y = to.y;
  await p<{}, {}, void>(ofWin.animate.bind(ofWin))(
      {position: {left: x, top: y, duration}}, {interrupt: false});
  // update window state
  const window = getWindow(id);
  const oldAnchor = getTopLeftPoint(window);
  const edges = moveEdges(oldAnchor, to, window.edges) as WindowEdges;
  updateWindowState(id, () => ({synthMove: false, edges}));
}
