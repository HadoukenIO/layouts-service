import {test} from 'ava';
import {Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';
import {setTimeout} from 'timers';

import {createChildWindow} from './utils/createChildWindow';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {resizeWindowToSize} from './utils/resizeWindowToSize';

let win1: Window, win2: Window;
test.beforeEach(async () => {
  win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 200,
    defaultWidth: 200,
    url: 'http://localhost:1337/demo/frameless-window.html',
    frame: false
  });
  win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 300,
    defaultLeft: 400,
    defaultHeight: 200,
    defaultWidth: 200,
    url: 'http://localhost:1337/demo/frameless-window.html',
    frame: false
  });
});
test.afterEach.always(async () => {
  await win1.close();
  await win2.close();
});

test('bottom', async t => {
  const win2Bounds = await getBounds(win2);

  await dragWindowTo(win1, win2Bounds.left + 50, win2Bounds.bottom + 2);
  await dragWindowTo(win2, 500, 500);

  const bounds1 = await getBounds(win1);
  const bounds2 = await getBounds(win2);

  t.is(bounds1.left, bounds2.left);
  t.is(bounds1.top, bounds2.bottom);
});

test('top', async t => {
  const win2Bounds = await getBounds(win2);

  await dragWindowTo(
      win1, win2Bounds.left + 50,
      win2Bounds.top - (win2Bounds.bottom - win2Bounds.top + 2));
  await dragWindowTo(win2, 500, 500);

  const bounds1 = await getBounds(win1);
  const bounds2 = await getBounds(win2);

  t.is(bounds1.left, bounds2.left);
  t.is(bounds1.bottom, bounds2.top);
});

test('left', async t => {
  const win2Bounds = await getBounds(win2);

  await dragWindowTo(
      win1, win2Bounds.left - (win2Bounds.right - win2Bounds.left - 2),
      win2Bounds.top + 40);
  await dragWindowTo(win2, 500, 500);

  const bounds1 = await getBounds(win1);
  const bounds2 = await getBounds(win2);

  t.is(bounds1.top, bounds2.top);
  t.is(bounds1.right, bounds2.left);
});

test('right', async t => {
  const win2Bounds = await getBounds(win2);

  await dragWindowTo(win1, win2Bounds.right + 2, win2Bounds.top + 40);
  await dragWindowTo(win2, 500, 500);

  const bounds1 = await getBounds(win1);
  const bounds2 = await getBounds(win2);

  t.is(bounds1.top, bounds2.top);
  t.is(bounds1.left, bounds2.right);
});

test('resizing group horizontally', async t => {
  let bounds1 = await getBounds(win1);
  let bounds2 = await getBounds(win2);

  await dragWindowTo(win1, bounds2.right + 2, bounds2.top);
  bounds1 = await getBounds(win1);
  bounds2 = await getBounds(win2);
  const combinedWidth = bounds1.right - bounds2.left;

  robot.moveMouseSmooth(bounds2.right - 1, (bounds2.top + bounds2.bottom) / 2);
  robot.mouseToggle('down');
  robot.moveMouseSmooth(
      bounds2.right - 1 + 40, (bounds2.top + bounds2.bottom) / 2);
  robot.mouseToggle('up');
  await new Promise(r => setTimeout(r, 2000));

  // recalculate bounds & combined width
  bounds1 = await getBounds(win1);
  bounds2 = await getBounds(win2);
  const win1Width = bounds1.right - bounds1.left;
  const win2Width = bounds2.right - bounds2.left;
  const newCombinedWidth = win1Width + win2Width;
  t.is(combinedWidth, newCombinedWidth);
});

test('resizing group vertically', async t => {
  let bounds1 = await getBounds(win1);
  let bounds2 = await getBounds(win2);

  await dragWindowTo(win1, bounds2.left, bounds2.bottom);
  bounds1 = await getBounds(win1);
  bounds2 = await getBounds(win2);
  const combinedHeight = bounds1.bottom - bounds2.top;

  robot.moveMouseSmooth((bounds2.left + bounds2.right) / 2, bounds2.bottom);
  robot.mouseToggle('down');

  robot.moveMouseSmooth(
      (bounds2.left + bounds2.right) / 2, bounds2.bottom + 50);
  robot.mouseToggle('up');

  // recalculate bounds & combined width
  bounds1 = await getBounds(win1);
  bounds2 = await getBounds(win2);
  const win1Height = bounds1.bottom - bounds1.top;
  const win2Height = bounds2.bottom - bounds2.top;
  const newCombinedHeight = win1Height + win2Height;

  t.is(combinedHeight, newCombinedHeight);
});

test('resize on snap, small to big', async t => {
  await resizeWindowToSize(win1, 200, 200);
  await resizeWindowToSize(win2, 300, 300);
  let bounds1 = await getBounds(win1);
  let bounds2 = await getBounds(win2);
  await dragWindowTo(win1, bounds2.right + 1, bounds2.top + 5);

  // update bounds
  bounds1 = await getBounds(win1);
  bounds2 = await getBounds(win2);

  const newHeight = bounds1.bottom - bounds1.top;
  t.is(newHeight, bounds2.height);
});

test('resize on snap, big to small', async t => {
  await resizeWindowToSize(win1, 300, 300);
  await resizeWindowToSize(win2, 200, 200);
  let bounds1 = await getBounds(win1);
  let bounds2 = await getBounds(win2);
  await dragWindowTo(win1, bounds2.right + 1, bounds2.top - 50);

  // update bounds
  bounds1 = await getBounds(win1);
  bounds2 = await getBounds(win2);

  const newHeight = bounds1.bottom - bounds1.top;
  t.is(newHeight, bounds2.height);
});
