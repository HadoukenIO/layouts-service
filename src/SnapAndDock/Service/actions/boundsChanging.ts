import {Fin, OfWindow} from '../../fin';
import {SnapPointData} from '../../types';
import {DRAG_OPACITY, PREVIEW_ERROR_FADE_OUT, PREVIEW_FADE_IN, PREVIEW_FAILURE, PREVIEW_SUCCESS, SNAP_PREVIEW_OPACITY, SNAP_TO_OPACITY} from '../config';
import {BoundsChangingEvent, cleanEventSnapPoint, cleanEventState, createNewEvent, getCurrentEvent, isSyntheticMove, setEventHandling, updateEventState} from '../state/event';
import {getGroup, getWindow, GroupStateMember, WindowStateMember} from '../state/store';
import {p, promiseMap} from '../utils/async';
import {willCollideOnSnap} from '../utils/group';
import {identityMatch} from '../utils/index';
import {isSamePoint, Point} from '../utils/point';
import {Bounds, windowEventToIgnore, WindowIdentity} from '../utils/window';

import {moveWindowTo} from './moveWindow';
import {shouldSnapTo} from './shouldSnap';
import {leaveGroup, unGroup} from './ungroup';

declare var fin: Fin;

let exWin: Window;

// @ts-ignore
const exampleWindow = new fin.desktop.Window(
    {
      name: 'exampleWindow',
      defaultWidth: 320,
      defaultHeight: 320,
      opacity: 0.0,
      minimizable: false,
      maximizable: false,
      defaultTop: -1000,
      defaultLeft: -1000,
      showTaskbarIcon: false,
      frame: false,
      state: 'normal',
      autoShow: true
    },
    () => {
      exWin = exampleWindow.getNativeWindow();
    });

async function showExampleWindow(
    snapPoint: SnapPointData, bounds: Bounds&WindowIdentity) {
  // set color of example window
  if (willCollideOnSnap(snapPoint, bounds)) {
    exWin.document.body.style.background = PREVIEW_FAILURE;
  } else {
    exWin.document.body.style.background = PREVIEW_SUCCESS;
  }
  // move example window to correct location and show
  const pt = snapPoint.snapPoint;
  await p<number, number, number, number, void>(exampleWindow.setBounds.bind(
      exampleWindow))(pt.x, pt.y, bounds.width, bounds.height);
  await bringToFront(exampleWindow);
}

export async function handleBoundsChanging(bounds: Bounds&WindowIdentity) {
  const window = getWindow(bounds);
  const event = getCurrentEvent();
  // ignore certain window movements and event while async actions being handled
  if (windowEventToIgnore(bounds, window)) {
    return;
  }
  if (window.groupId) {
    return;
  }
  // setup and track current window event
  if (!event.active) {
    createNewEvent(window, bounds);
    return;
  } else if (isSyntheticMove(bounds, event)) {
    // if this is an app/API move, return out
    return;
  } else if (event.synthMove) {
    // not a synthetic (app/API) move
    updateEventState(() => ({synthMove: false}));
    await updateOpacityById(bounds, DRAG_OPACITY);
  }

  // making sure another event not fired while this one is live
  if (event.window && !identityMatch(event.window.identity, window.identity)) {
    console.log('*** another event going on:old, new', event.window, window);
    return;
  }

  // check to see if there are nearby snap points
  const snapPoint = shouldSnapTo(bounds, bounds);
  // if currently snappable based on user drag
  if (snapPoint) {
    await handleBoundsChangingSnapPoint(snapPoint, bounds, event);
  } else if (event.snapTo) {
    // no valid snap point found, update previous snapTo window, hide exWin
    await updateOpacityById(event.snapTo, 1);
    await p<{}, void>(exampleWindow.updateOptions.bind(exampleWindow))(
        {opacity: 0});
    cleanEventSnapPoint();
  }
}

async function handleBoundsChangingSnapPoint(
    snapPoint: SnapPointData, bounds: Bounds&WindowIdentity,
    event: BoundsChangingEvent) {
  const snapTo = snapPoint.id;
  const pt = snapPoint.snapPoint;

  if (event.snapPoint && isSamePoint(event.snapPoint, pt)) {
    // snapTo window/group for the current event is the same as previous
    await showExampleWindow(snapPoint, bounds);
    return;
  } else if (event.snapTo) {
    // snapTo window is not the same, update previous window
    await Promise.all(
        [updateOpacity(exampleWindow, 0), updateOpacityById(event.snapTo, 1)]);
  }
  // handle new snapTo window
  const snapToEventProps = {snapTo, snapPoint: pt};

  // set color, move to location and show example window
  await showExampleWindow(snapPoint, bounds);
  await Promise.all([
    updateOpacity(exampleWindow, SNAP_PREVIEW_OPACITY, PREVIEW_FADE_IN),
    updateOpacityById(snapTo, SNAP_TO_OPACITY, PREVIEW_FADE_IN)
  ]);
  updateEventState(() => snapToEventProps);
}

// called at the end of onBoundsChanged - overwrite event and update opacities
export async function endBoundsChanging(
    identity: WindowIdentity, snapped: boolean) {
  const window = getWindow(identity);
  const event = getCurrentEvent();
  const promises = [] as Array<Promise<{}|void>>;
  if (event.active) {
    promises.push(updateOpacityById(identity, 1, 1));
    if (event.snapTo) {
      promises.push(updateOpacityById(
          event.snapTo, 1, snapped ? 1 : PREVIEW_ERROR_FADE_OUT));
    }
  }

  // hide the example window - if not snapped show red example longer
  if (snapped) {
    promises.push(updateOpacity(exampleWindow, 0));
  } else {
    promises.push(bringToFront(exampleWindow));
    promises.push(updateOpacity(exampleWindow, 0, PREVIEW_ERROR_FADE_OUT));
  }
  await Promise.all(promises);
  cleanEventState();
}

// update the opacity of a single window
export async function updateOpacity(
    ofWin: OfWindow, opacity: number, duration = 1) {
  await p<{}, {}, void>(ofWin.animate.bind(ofWin))(
      {opacity: {opacity, duration}}, {interrupt: false});
}

async function bringToFront(win: OfWindow) {
  return p(win.bringToFront.bind(win))();
}

async function bringToFrontById(id: number|WindowIdentity) {
  typeof id === 'object' ?
      await bringToFront(fin.desktop.Window.wrap(id.uuid, id.name)) :
      await
      promiseMap(
          getGroup(id).windows,
          async (id: WindowIdentity) =>
              await bringToFront(fin.desktop.Window.wrap(id.uuid, id.name)));
}

// update the opacity of a window or group
async function updateOpacityById(
    id: number|WindowIdentity, opacity: number, duration = 1) {
  typeof id === 'object' ?
      await updateOpacity(
          fin.desktop.Window.wrap(id.uuid, id.name), opacity, duration) :
      await
      promiseMap(
          getGroup(id).windows,
          async (id: WindowIdentity) => await updateOpacity(
              fin.desktop.Window.wrap(id.uuid, id.name), opacity, duration));
}
