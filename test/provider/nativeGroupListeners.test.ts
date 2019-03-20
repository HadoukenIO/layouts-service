import {Fin, Window} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../src/client/main';
import {undockWindow} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertMoved, assertNotGrouped, assertNotMoved} from './utils/assertions';
import {getConnection} from './utils/connect';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragSideToSide} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';

// Valid ways of grouping two windows (used to parameterize large number of
// similar tests)
const groupingFunctions = {
    'snap': snapWindows,
    'native': groupWindows,
};

// Valid ways of ungrouping two windows (used to parameterize large number of
// similar tests)
const ungroupingFunctions = {
    'unsnap': unsnapWindows,
    'native': ungroupWindows,
};

type GroupingType = keyof typeof groupingFunctions;
type UngroupingType = keyof typeof ungroupingFunctions;

let win1: Window, win2: Window;
let windows: Window[];
let fin: Fin;

/* ====== Setup/Teardown ====== */

beforeAll(async () => {
    fin = await getConnection();
});
beforeEach(async () => {
    // Spawn two windows - win1 untabbed, win2 tabbed
    win1 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 100,
        defaultLeft: 100,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    win2 = await createChildWindow({
        autoShow: true,
        saveWindowState: false,
        defaultTop: 300,
        defaultLeft: 400,
        defaultHeight: 200,
        defaultWidth: 200,
        url: 'http://localhost:1337/demo/popup.html',
        frame: false
    });
    windows = [win1, win2];
    await delay(1000);
});
afterEach(async () => {
    if (win1 && win1.identity) {
        await win1.close();
    }
    if (win2 && win2.identity) {
        await win2.close();
    }
    win1 = win2 = {} as Window;
    windows = new Array<Window>();
});
afterEach(teardown);

/* ====== Utils ====== */

async function snapWindows(win1: Window, win2: Window) {
    // Snap the windows together
    await dragSideToSide(win2, 'left', win1, 'right');

    // Assert in snap group and native group
    await assertGrouped(win1, win2);
}

async function groupWindows(win1: Window, win2: Window) {
    // Native group the windows
    win1.joinGroup(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2);
}

async function unsnapWindows(win1: Window, win2: Window, shouldMove: boolean) {
    // Undock
    const boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    const boundsAfter = await getBounds(win1);

    if (shouldMove) {
        // Assert moved
        await assertMoved(boundsBefore, boundsAfter);
    } else {
        // Assert window did not move
        await assertNotMoved(boundsBefore, boundsAfter);
    }

    // Assert not in snap group or native group
    await assertNotGrouped(win1);
    await assertNotGrouped(win2);
}

async function ungroupWindows(win1: Window, win2: Window, shouldMove: boolean) {
    // Native ungroup
    const boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    const boundsAfter = await getBounds(win1);

    // Assert did not move (smoke test for native grouping)
    await assertNotMoved(boundsBefore, boundsAfter);

    // Assert not in snap group or native group
    await assertNotGrouped(win1);
    await assertNotGrouped(win2);
}

/* ====== Tests ====== */

for (const firstGroup of Object.keys(groupingFunctions) as GroupingType[]) {
    for (const firstUngroup of Object.keys(ungroupingFunctions) as UngroupingType[]) {
        let secondUngroup: UngroupingType;
        switch (firstUngroup) {
            case 'native':
                secondUngroup = 'unsnap';
                break;
            case 'unsnap':
                secondUngroup = 'native';
                break;
            default:
                throw new Error('Invalid grouping type in native group event test');
        }
        for (const ungroupedIndex of [0, 1] as (0 | 1)[]) {
            runNativeGroupListenerTest(firstGroup, firstUngroup, secondUngroup, ungroupedIndex);
        }
    }
}

function runNativeGroupListenerTest(groupType: GroupingType, firstUngroupType: UngroupingType, secondUngroupType: UngroupingType, ungroupedWindowIndex: 0|1) {
    test(
        `Native window group works the same as snapService grouping (${[groupType, firstUngroupType, secondUngroupType, ungroupedWindowIndex].join(', ')})`,
        async () => {
            // Group the windows
            await groupingFunctions[groupType](windows[0], windows[1]);

            // Ungroup the windows with the first method. Should only move on
            // unsnap.
            await ungroupingFunctions[firstUngroupType](windows[0], windows[0], firstUngroupType === 'unsnap');

            // Ungroup the windows with the second method. Should never move.
            await ungroupingFunctions[secondUngroupType](windows[0], windows[ungroupedWindowIndex], false);
        });
}

test('Native window group works the same as snapService grouping (native merge, undock, native, 1)', async () => {
    // Native group the windows
    win1.mergeGroups(win2);

    // Assert in snap group and native group
    await assertGrouped(win1, win2);

    // Undock
    let boundsBefore = await getBounds(win1);
    await undockWindow(win1.identity as WindowIdentity);
    let boundsAfter = await getBounds(win1);

    // Assert moved
    await assertMoved(boundsBefore, boundsAfter);

    // Assert not in snap group or native group
    await assertNotGrouped(win1);
    await assertNotGrouped(win2);

    // Native ungroup
    boundsBefore = await getBounds(win1);
    await win1.leaveGroup();
    boundsAfter = await getBounds(win1);

    // Assert window did not move
    await assertNotMoved(boundsBefore, boundsAfter);
});
