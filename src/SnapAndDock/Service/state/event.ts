import {Point} from '../utils/point';
import {Bounds, WindowIdentity} from '../utils/window';

import {clone, Updater, WindowStateMember} from './store';

export interface BoundsChangingEvent {
  active: boolean;
  window: WindowStateMember|null;
  handling: boolean;
  synthMove: boolean;
  left: number|null;
  top: number|null;
  bottom: number|null;
  right: number|null;
  snapPoint: Point|null;
  snapTo: number|WindowIdentity|null;
}

let boundsChangingEvent: BoundsChangingEvent = generateCleanEvent();

function generateCleanEvent() {
  return {
    active: false,
    window: null,
    handling: false,
    synthMove: false,
    left: null,
    top: null,
    right: null,
    bottom: null,
    snapPoint: null,
    snapTo: null
  };
}

export function getCurrentEvent() {
  return boundsChangingEvent;
}

export function updateEventState(update: Updater<BoundsChangingEvent>) {
  boundsChangingEvent = {
    ...boundsChangingEvent,
    ...update(clone(boundsChangingEvent))
  };
  return boundsChangingEvent;
}

export function createNewEvent(
    window: WindowStateMember, bounds: Bounds&WindowIdentity) {
  const {top, left, bottom, right} = bounds;
  const newEventProps =
      {window, synthMove: true, active: true, top, left, bottom, right};
  updateEventState(() => newEventProps);
}

export function cleanEventState() {
  const cleanEvent = generateCleanEvent();
  return updateEventState(() => cleanEvent);
}

export function cleanEventSnapPoint() {
  const cleanProps = {
    left: null,
    top: null,
    bottom: null,
    right: null,
    snapPoint: null,
    snapTo: null
  };
  return updateEventState(() => cleanProps);
}

export function setEventHandling(bool: boolean) {
  return updateEventState(() => ({handling: bool}));
}

export function isSyntheticMove(bounds: Bounds, event: BoundsChangingEvent) {
  if (event.synthMove && event.left === bounds.left &&
      event.top === bounds.top && event.bottom === bounds.bottom &&
      event.right === bounds.right) {
    return true;
  }
  return false;
}
