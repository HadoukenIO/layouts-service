import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../src/provider/model/DesktopWindow';
import {explodeGroup} from '../demo/utils/snapServiceUtils';

import {getConnection} from './utils/connect';
import {getBounds} from './utils/getBounds';
import {isInGroup} from './utils/isInGroup';
import {isOverlappedWith} from './utils/isOverlappedWith';
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
    1: {'default': []},
    2: {
        // 1
        // 2
        'vertical': [
            [1, 'top-left', 0, 'bottom-left', {x: 10, y: 2}],
        ],
        // 1 2
        'horizontal': [
            [1, 'top-left', 0, 'top-right', {x: 2, y: 10}],
        ]
    },
    3: {
        // 1 2 3
        'line': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'bottom-left', 1, 'bottom-right', {x: 2, y: -10}],
        ],
        //   1
        // 2
        //   3
        'vertical-triangle': [
            [2, 'top-left', 0, 'bottom-left', {x: 10, y: 2}],
            [1, 'top-right', 0, 'top-left', {x: -2, y: 102}],
        ],
        // 1 2
        //  3
        'horizontal-triangle': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-left', 0, 'bottom-left', {x: 102, y: 2}],
        ]
    },
    4: {
        // 1 2
        // 3 4
        'square': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-right', 0, 'bottom-right', {x: -10, y: 2}],
            [3, 'top-left', 0, 'bottom-right', {x: 10, y: 2}],
        ]
    },
    5: {
        // 1 2
        //  3
        // 4 5
        'hourglass': [
            [0, 'top-left', 0, 'top-left', {x: -100, y: -100}],
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-left', 0, 'bottom-left', {x: 100, y: 2}],
            [3, 'top-right', 2, 'bottom-left', {x: 95, y: 2}],
            [4, 'top-left', 2, 'bottom-right', {x: -105, y: 2}],
        ]
    },
    7: {
        //  1 2
        // 3 4 5
        //  6 7
        'honeycomb': [
            [0, 'top-left', 0, 'top-left', {x: -100, y: -100}],
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-left', 0, 'bottom-left', {x: -105, y: 2}],
            [3, 'top-left', 2, 'top-right', {x: 2, y: 2}],
            [4, 'top-left', 3, 'top-right', {x: 2, y: 2}],
            [5, 'top-right', 3, 'bottom-left', {x: 95, y: 2}],
            [6, 'top-left', 3, 'bottom-right', {x: -105, y: 2}],
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

async function assertExploded(t: GenericTestContext<AnyContext>) {
    // Check each window
    for (let i = 0; i < windows.length; i++) {
        // Windows are no longer grouped
        if (await isInGroup(windows[i])) {
            t.fail(`Window ${i} still in group after explode`);
        } else {
            t.pass();
        }

        // Windows are not overlapped
        for (let j = i + 1; j < windows.length; j++) {
            if (await isOverlappedWith(windows[i], windows[j])) {
                t.fail(`Window ${i} overlapped with window ${j} after explode`);
            } else {
                t.pass();
            }
        }
    }
}

/*
 * A basic explode test will be run for each window arrangement in the
 * arrangemtns object. To add an additional window layouts to be tested, simply
 * add new entries there.
 */
Object.keys(arrangements).forEach(num => {
    const count = Number.parseInt(num);

    Object.keys(arrangements[count]).forEach(name => {
        test(`${count} windows - ${name}`, async t => {
            // This will spawn the required number of windows in the correct
            // positions/groups
            windows = await windowInitializer.initWindows(count, name);

            // Special handling for single window. Checks window did not move in any way
            if (count === 1) {
                const boundsBefore = await getBounds(windows[0]);
                await explodeGroup(windows[0].identity as WindowIdentity);
                const boundsAfter = await getBounds(windows[0]);
                t.deepEqual(boundsBefore, boundsAfter, 'Single window moved during explode');
            } else {
                await explodeGroup(windows[0].identity as WindowIdentity);
            }

            // Runs multiple tests to ensure that the group has succesfully exploded.
            await assertExploded(t);
        });
    });
});