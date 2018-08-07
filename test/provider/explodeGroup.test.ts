import { test, GenericTestContext, Context } from 'ava';
import { dragWindowToOtherWindow, dragSideToSide, Corner } from './utils/dragWindowTo';
import { getBounds } from './utils/getBounds';
import { createChildWindow } from './utils/createChildWindow';
import { Window, Fin } from 'hadouken-js-adapter';
import { getConnection } from './utils/connect';
import { WindowIdentity } from './utils/undockWindow';
import { explodeGroup } from './utils/explodeGroup';
import { isOverlappedWith } from './utils/isOverlappedWith';
import { isInGroup } from './utils/isInGroup';
import { Point } from 'hadouken-js-adapter/out/types/src/api/system/point';

// TODO - Change client/service file structure to allow importing these values
const UNDOCK_MOVE_DISTANCE = 30;

let windows: Window[] = new Array<Window>();
let fin: Fin;

const windowPositions = [
    { defaultTop: 300, defaultLeft: 300 },
    { defaultTop: 300, defaultLeft: 600 },
    { defaultTop: 600, defaultLeft: 300 },
    { defaultTop: 600, defaultLeft: 600 },
    { defaultTop: 900, defaultLeft: 300 },
    { defaultTop: 900, defaultLeft: 600 },
    { defaultTop: 300, defaultLeft: 900 },
    { defaultTop: 600, defaultLeft: 900 },
    { defaultTop: 900, defaultLeft: 900 }
];
const windowOptions = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 200,
    defaultWidth: 200,
    url: 'http://localhost:1337/demo/frameless-window.html',
    frame: false
};

type MoveArgs = [number, Corner, number, Corner, Point];

type Arrangement = MoveArgs[];

interface ArrangementsType {
    [numWindows: number]: {
        [arrangementName: string]: Arrangement
    };
}

test.before(async () => {
    fin = await getConnection();
});
test.afterEach.always(async () => {
    // Closes all windows and resets the array for the next test.
    for (const win of windows) {
        if (win) { await win.close(); }
    }
    windows = new Array<Window>();
});

/* ----- Helper Functions ----- */

async function initWindows(num: number, arrangementName?:string) {
    await spawnWindows(num);

    if (arrangementName && arrangements.hasOwnProperty(num) && arrangements[num].hasOwnProperty(arrangementName)) {
        for (const moveArgs of arrangements[num][arrangementName]) {
            // Destruct the move args before calling it as typescript causes issues otherwise.
            const [w1,c1,w2,c2,d] = moveArgs;
            await dragWindowToOtherWindow(windows[w1],c1,windows[w2],c2,d);
        }
    }
}



async function spawnWindows(num: number) {
    for (let i = 0; i < num; i++) {
        windows[i] = await createChildWindow({ ...(windowPositions[i]), ...windowOptions });
    }
}

// tslint:disable-next-line:no-any
async function assertExploded(t: GenericTestContext<Context<any>>) {

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

/* ----- Individual Tests ----- */

test('One ungrouped window - no effect on explode', async t => {
    await spawnWindows(1);

    // Slight delay to ensure window is completely loaded
    await new Promise(r => setTimeout(r, 1000));

    const boundsBefore = await getBounds(windows[0]);

    await explodeGroup(windows[0].identity as WindowIdentity);

    const boundsAfter = await getBounds(windows[0]);

    // Check window did not move in any way
    t.deepEqual(boundsBefore, boundsAfter, 'Single window moved during explode');

    // Runs multiple assertions checking that the group is exploded. Somewhat irrelevant in this case, but run it anyway as a smoke test.
    await assertExploded(t);
});

/* ----- Macro Tests ----- */

/*  A basic explode test will be run for each window arrangement in this object.
* To add an additional test, simply add a new entry. The format is: 
* { 
*    number of windows: { 
*        name of window arrangement: [
*            Array of window movements (executed in sequence)
*            that will create the desired arrangement of format 
*            [moved window index, moved corner, target window index, target corner, offset]
*        ]
*    }
* }
*/
const arrangements:ArrangementsType = {
    2: {
        // 1
        // 2
        'vertical': [
            [1, 'top-left', 0, 'bottom-left', { x: 10, y: 2 }],
        ], 
        // 1 2
        'horizontal': [
            [1, 'top-left', 0, 'top-right', { x: 2, y: 10 }],
        ]
    },
    3: {
        // 1 2 3
        'line': [
            [1, 'bottom-left', 0, 'bottom-right', { x: 2, y: -10 }],
            [2, 'bottom-left', 1, 'bottom-right', { x: 2, y: -10 }],
        ],
        //   1
        // 2
        //   3
        'vertical-triangle': [
            [2, 'top-left', 0, 'bottom-left', { x: 10, y: 2 }],
            [1, 'top-right', 0, 'top-left', { x: -2, y: 102 }],
        ],
        // 1 2
        //  3
        'horizontal-triangle': [
            [1, 'bottom-left', 0, 'bottom-right', { x: 2, y: -10 }],
            [2, 'top-left', 0, 'bottom-left', {x: 102, y: 2}],
        ]
    },
    4: {
        // 1 2
        // 3 4
        'square': [
            [1, 'bottom-left', 0, 'bottom-right', { x: 2, y: -10 }],
            [2, 'top-right', 0, 'bottom-right', { x: -10, y: 2 }],
            [3, 'top-left', 0, 'bottom-right', { x: 10, y: 2 }],
        ]
    },
    5: {
        // 1 2
        //  3
        // 4 5
        'hourglass': [
            [0, 'top-left', 0, 'top-left', {x: -100, y: -100}],
            [1, 'bottom-left', 0, 'bottom-right', { x: 2, y: -10 }],
            [2, 'top-left', 0, 'bottom-left', {x: 100, y: 2}],
            [3, 'top-right', 2, 'bottom-left', {x:95, y:2}],
            [4, 'top-left', 2, 'bottom-right', {x:-105, y:2}],
        ]
    },
    7: {
        //  1 2
        // 3 4 5
        //  6 7
        'honeycomb': [
            [0, 'top-left', 0, 'top-left', {x: -100, y: -100}],
            [1, 'bottom-left', 0, 'bottom-right', { x: 2, y: -10 }],
            [2, 'top-left', 0, 'bottom-left', {x: -105, y: 2}],
            [3, 'top-left', 2, 'top-right', {x:2, y:2}],
            [4, 'top-left', 3, 'top-right', {x:2, y:2}],
            [5, 'top-right', 3, 'bottom-left', {x:95, y:2}],
            [6, 'top-left', 3, 'bottom-right', {x:-105, y:2}],
        ]
    }
};

Object.keys(arrangements).forEach(num => {
    const count = Number.parseInt(num);
    
    Object.keys(arrangements[count]).forEach(name => {
        test(`${count} windows - ${name}`, async t => {

            await initWindows(count, name);

            await explodeGroup(windows[0].identity as WindowIdentity);

            await assertExploded(t);

        });
    });
});