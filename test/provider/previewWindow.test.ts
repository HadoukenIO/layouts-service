import {test} from 'ava';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as robot from 'robotjs';

import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {dragWindowAndHover} from './utils/dragWindowAndHover';
import {getBounds} from './utils/getBounds';

let previewWin: _Window;

test.beforeEach(async () => {
  const fin = await getConnection();
  previewWin =
      await fin.Window.wrap({name: 'previewWindow-', uuid: 'layouts-service'});
});

test('preview on right side', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 200,
    defaultWidth: 200
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 300,
    defaultLeft: 400,
    defaultHeight: 200,
    defaultWidth: 200
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(win2, win1Bounds.right + 2, win1Bounds.top + 5);
  const previewBounds = await getBounds(previewWin);
  robot.mouseToggle('up');

  t.is(previewBounds.height, win2Bounds.height);
  t.is(previewBounds.width, win2Bounds.width);
  t.is(previewBounds.top, win1Bounds.top);
  t.is(previewBounds.left, win1Bounds.right);

  await win1.close();
  await win2.close();
});
test('preview on left side', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 500,
    defaultHeight: 200,
    defaultWidth: 200
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 300,
    defaultLeft: 100,
    defaultHeight: 200,
    defaultWidth: 200
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(
      win2, win1Bounds.left - win2Bounds.width - 2, win1Bounds.top + 5);
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win2Bounds.height);
  t.is(previewBounds.width, win2Bounds.width);
  t.is(previewBounds.top, win1Bounds.top);
  t.is(previewBounds.right, win1Bounds.left);

  await win1.close();
  await win2.close();
});

test('preview on top', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 400,
    defaultLeft: 100,
    defaultHeight: 200,
    defaultWidth: 200
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 400,
    defaultHeight: 200,
    defaultWidth: 200
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(
      win2, win1Bounds.left + 5, win1Bounds.top - win2Bounds.height - 10);
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win2Bounds.height);
  t.is(previewBounds.width, win2Bounds.width);
  t.is(previewBounds.bottom, win1Bounds.top);
  t.is(previewBounds.left, win1Bounds.left);

  await win1.close();
  await win2.close();
});

test('preview on bottom', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 200,
    defaultWidth: 200
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 400,
    defaultLeft: 400,
    defaultHeight: 200,
    defaultWidth: 200
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(win2, win1Bounds.left + 5, win1Bounds.bottom - 2);
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win2Bounds.height);
  t.is(previewBounds.width, win2Bounds.width);
  t.is(previewBounds.top, win1Bounds.bottom);
  t.is(previewBounds.left, win1Bounds.left);

  await win1.close();
  await win2.close();
});


test('preview resize width on snap - smaller to bigger', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 300,
    defaultWidth: 300
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 400,
    defaultLeft: 400,
    defaultHeight: 200,
    defaultWidth: 200
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(win2, win1Bounds.left + 5, win1Bounds.bottom - 2);
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win2Bounds.height);
  t.is(previewBounds.width, win1Bounds.width);
  t.is(previewBounds.top, win1Bounds.bottom);
  t.is(previewBounds.left, win1Bounds.left);

  await win1.close();
  await win2.close();
});

test('preview resize height on snap - smaller to bigger', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 300,
    defaultWidth: 300
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 300,
    defaultLeft: 400,
    defaultHeight: 190,
    defaultWidth: 220
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(
      win2, win1Bounds.right + 2,
      win1Bounds.top + ((win2Bounds.bottom - win2Bounds.top) / 2));
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win1Bounds.height);
  t.is(previewBounds.width, win2Bounds.width);
  t.is(previewBounds.top, win1Bounds.top);
  t.is(previewBounds.left, win1Bounds.right);

  await win1.close();
  await win2.close();
});

test('preview resize width on snap - bigger to smaller', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 200,
    defaultWidth: 225
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 400,
    defaultLeft: 400,
    defaultHeight: 300,
    defaultWidth: 300
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(win2, win1Bounds.left + 5, win1Bounds.bottom - 2);
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win2Bounds.height);
  t.is(previewBounds.width, win1Bounds.width);
  t.is(previewBounds.top, win1Bounds.bottom);
  t.is(previewBounds.left, win1Bounds.left);

  await win1.close();
  await win2.close();
});

test('preview resize height on snap - bigger to smaller', async t => {
  const win1 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 220,
    defaultWidth: 220
  });
  const win2 = await createChildWindow({
    autoShow: true,
    saveWindowState: false,
    defaultTop: 300,
    defaultLeft: 400,
    defaultHeight: 300,
    defaultWidth: 300
  });

  const win1Bounds = await getBounds(win1);
  const win2Bounds = await getBounds(win2);
  await dragWindowAndHover(win2, win1Bounds.right + 2, win1Bounds.top + 2);
  const previewBounds = await previewWin.getBounds();
  robot.mouseToggle('up');

  t.is(previewBounds.height, win1Bounds.height);
  t.is(previewBounds.width, win2Bounds.width);
  t.is(previewBounds.top, win1Bounds.top);
  t.is(previewBounds.left, win1Bounds.right);

  await win1.close();
  await win2.close();
});