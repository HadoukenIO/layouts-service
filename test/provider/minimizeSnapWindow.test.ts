import {test, TestContext} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {assertGrouped} from './utils/assertions';
import {getConnection} from './utils/connect';
import {delay} from './utils/delay';
import {ArrangementsType, WindowInitializer} from './utils/WindowInitializer';

let windows: Window[] = new Array<Window>();
let fin: Fin;
let windowInitializer: WindowInitializer;

const windowPositions = [
    {defaultTop: 300, defaultLeft: 300},
    {defaultTop: 300, defaultLeft: 600},
    {defaultTop: 600, defaultLeft: 300},
    {defaultTop: 600, defaultLeft: 600},
    {defaultTop: 900, defaultLeft: 300},
    {defaultTop: 900, defaultLeft: 600},
    {defaultTop: 300, defaultLeft: 900},
    {defaultTop: 600, defaultLeft: 900},
    {defaultTop: 900, defaultLeft: 900}
];
const windowOptions = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 200,
    defaultWidth: 200,
    url: 'http://localhost:1337/demo/frameless-window.html',
    frame: false
};

const arrangements: ArrangementsType = {
    2: {
        'default': [
            [1, 'top-left', 0, 'bottom-left', {x: 10, y: 2}],
        ],
    },
    3: {
        // 1 2 3
        'line': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'bottom-left', 1, 'bottom-right', {x: 2, y: -10}],
        ]
    }
};

test.before(async () => {
    fin = await getConnection();
    windowInitializer = new WindowInitializer(arrangements, windowPositions, windowOptions);
});
test.afterEach.always(async () => {
    // Closes all windows and resets the array for the next test.
    for (const win of windows) {
        if (win) {
            await win.close();
        }
    }
    windows = new Array<Window>();
});

async function assertAllMinimized(t: TestContext) {
    return Promise.all(windows.map(async win => {
        const state = await win.getState();
        t.is(state, 'minimized');
    }));
}

async function assertAllRestored(t: TestContext) {
    return Promise.all(windows.map(async win => {
        const state = await win.getState();
        t.is(state, 'normal');
    }));
}

test('Basic Minimize', async t => {
    // Spawn two windows grouped side-by-side
    windows = await windowInitializer.initWindows(2, 'default');

    // Minimize the first window
    await windows[0].minimize();

    // Wait to make sure the minimize has completed
    await delay(500);

    // Check that the windows have both minimized
    await assertAllMinimized(t);
});

test('Basic Minimize and Restore - Restore Same Window', async t => {
    // Spawn two windows grouped side-by-side
    windows = await windowInitializer.initWindows(2, 'default');
    // Minimize the first window
    await windows[0].minimize();
    // Wait to make sure the minimize has completed
    await delay(500);
    // Check that the windows have both minimized
    await assertAllMinimized(t);
    // Restore the first window
    await windows[0].restore();
    // Wait to make sure the restore has completed
    await delay(500);
    // Check that the windows have both minimized
    await assertAllRestored(t);
});

test('Basic Minimize and Restore - Restore Other Window', async t => {
    // Spawn two windows grouped side-by-side
    windows = await windowInitializer.initWindows(2, 'default');
    // Minimize the first window
    await windows[0].minimize();
    // Wait to make sure the minimize has completed
    await delay(500);
    // Check that the windows have both minimized
    await assertAllMinimized(t);
    // Restore the second window
    await windows[1].restore();
    // Wait to make sure the restore has completed
    await delay(500);
    // Check that the windows have both restored
    await assertAllRestored(t);
    // Check that the windows are still grouped properly after the restore
    await assertGrouped(windows[0], windows[1], t);
});

test('Three-window Minimize', async t => {
    // Spawn three windows grouped side-by-side
    windows = await windowInitializer.initWindows(3, 'line');
    // Minimize the first window
    await windows[0].minimize();
    // Wait to make sure the minimize has completed
    await delay(500);
    // Check that the windows have all minimized
    await assertAllMinimized(t);
});

test('Three-window Minimize and Restore', async t => {
    // Spawn three windows grouped side-by-side
    windows = await windowInitializer.initWindows(3, 'line');
    // Minimize the first window
    await windows[0].minimize();
    // Wait to make sure the minimize has completed
    await delay(500);
    // Check that the windows have all minimized
    await assertAllMinimized(t);
    // Restore the middle window
    await windows[1].restore();
    // Wait to make sure the restore has completed
    await delay(500);
    // Check that the windows have all restored
    await assertAllRestored(t);
    // Check that the windows are still grouped properly after the restore
    await assertGrouped(windows[0], windows[1], t);
    await assertGrouped(windows[1], windows[2], t);
});