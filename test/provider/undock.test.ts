import {GenericTestContext, test, TestContext} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {Corner, dragSideToSide, dragWindowTo, dragWindowToOtherWindow} from './utils/dragWindowTo';
import {getBounds, NormalizedBounds} from './utils/getBounds';
import {getDistanceBetween} from './utils/getDistanceBetween';
import {isAdjacentTo} from './utils/isAdjacentTo';
import {opposite, perpendicular, Side} from './utils/SideUtils';
import {undockWindow, WindowIdentity} from './utils/undockWindow';

// TODO - Change client/service file structure to allow importing these values
const UNDOCK_MOVE_DISTANCE = 30;

let windows: Window[] = new Array<Window>();
let fin: Fin;

const windowPositions = [
  {defaultTop: 300, defaultLeft: 300}, {defaultTop: 300, defaultLeft: 600},
  {defaultTop: 600, defaultLeft: 300}, {defaultTop: 600, defaultLeft: 600}
];
const windowOptions = {
  autoShow: true,
  saveWindowState: false,
  defaultHeight: 200,
  defaultWidth: 200,
  url: 'http://localhost:1337/demo/frameless-window.html',
  frame: false
};

test.before(async () => {
  fin = await getConnection();
});
test.afterEach.always(async () => {
  for (const win of windows) {
    if (win) {
      await win.close();
    }
  }
  windows = new Array<Window>();
});


async function initWindows(t: TestContext, num: number, side?: Side) {
  for (let i = 0; i < num; i++) {
    windows[i] =
        await createChildWindow({...(windowPositions[i]), ...windowOptions});
  }

  if (num === 2 && side) {
    // Snap the windows
    await dragSideToSide(windows[1], opposite(side), windows[0], side);

    // Windows are adjacent
    t.true(await isAdjacentTo(windows[0], windows[1], side));
  }

  if (num === 4) {
    await dragWindowToOtherWindow(
        windows[1], 'bottom-left', windows[0], 'bottom-right', {x: 2, y: -10});
    await dragWindowToOtherWindow(
        windows[2], 'top-right', windows[0], 'bottom-right', {x: -10, y: 2});
    await dragWindowToOtherWindow(
        windows[3], 'top-left', windows[0], 'bottom-right', {x: 10, y: 2});
  }
}

test('One ungrouped window - no effect on undock', async t => {
  await initWindows(t, 1);

  const boundsBefore = await getBounds(windows[0]);

  await undockWindow(windows[0].identity as WindowIdentity);

  await new Promise((r) => setTimeout(r, 2000));

  const boundsAfter = await getBounds(windows[0]);

  t.deepEqual(boundsBefore, boundsAfter);
});

// Runs two-window test for each side
(['bottom', 'top', 'left', 'right'] as Side[]).forEach((side: Side) => {
  twoWindowTest(side);
});

// Runs four-window test for each corner
(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as Corner[])
    .forEach((corner) => {
      fourWindowTest(corner);
    });

function twoWindowTest(side: Side) {
  test('Two windows - undock ' + side, async t => {
    // Spawn and snap two windows
    await initWindows(t, 2, side);

    // Send and undock message to the service
    await undockWindow(windows[1].identity as WindowIdentity);

    // Undocked window moved away from other window(s)
    t.is(
        await getDistanceBetween(windows[0], side, windows[1], opposite(side)),
        UNDOCK_MOVE_DISTANCE);
    t.is(
        await getDistanceBetween(
            windows[0], perpendicular(side), windows[1], perpendicular(side)),
        0);
  });
}


function fourWindowTest(corner: Corner) {
  // Map from corner to window index
  const cornerToWindowMap = {
    'top-left': 0,
    'top-right': 1,
    'bottom-left': 2,
    'bottom-right': 3,
  };

  // Map to get the offset from a window index to the window in the direction
  // from it example 1: the window below window 1 is (1 + map['bottom']) = 1 + 2
  // ==> window 3 is below window 1 example 2: the window to the right of window
  // 2 is (2 + map['right']) = 2 + 1 ==> window 3 is right of window 2
  const sideToWindowMap = {'bottom': 2, 'top': -2, 'right': 1, 'left': -1};

  test('Four windows - undock ' + corner, async t => {
    // Spawn and snap 4 windows
    await initWindows(t, 4);

    // Gets the window index to be undocked
    const undockedIndex = cornerToWindowMap[corner];

    // Send undock message to the service
    await undockWindow(windows[undockedIndex].identity as WindowIdentity);

    // These three lines use the sideToWindowMap to find the windows that the
    // undocked windows moved away from (e.g. top-left ==> bottom , right) It
    // then calculates the spacing between those windows and the undocked window
    const [sideY, sideX] = corner.split('-') as Side[];
    const distanceX = await getDistanceBetween(
        windows[undockedIndex], opposite(sideX),
        windows[undockedIndex + sideToWindowMap[opposite(sideX)]], sideX);
    const distanceY = await getDistanceBetween(
        windows[undockedIndex], opposite(sideY),
        windows[undockedIndex + sideToWindowMap[opposite(sideY)]], sideY);

    // Check that the window moved in the expected way
    t.is(distanceX, UNDOCK_MOVE_DISTANCE);
    t.is(distanceY, UNDOCK_MOVE_DISTANCE);
  });
}
