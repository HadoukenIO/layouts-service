import {Context, GenericTestContext, Macro, test, TestContext} from 'ava';
import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {opposite, Side, sideArray} from '../../provider/utils/SideUtils';

enum FrameStateEnum {
    'framed' = 1,
    'frameless' = 0,
}

type FrameState = keyof typeof FrameStateEnum|FrameStateEnum;

// These names are a bit awkward, but match the conventions in Ava's type definitions
interface BasicSnapDockContext {
    windows: _Window[];
}
type BasicSnapDockTestContext = GenericTestContext<Context<BasicSnapDockContext>>;
interface SnapDockMacro extends Macro<BasicSnapDockTestContext> {
    (t: BasicSnapDockTestContext, side: Side, frame: FrameState): void;
}

type TestIdentifier = {
    name: string,
    side: Side,
    frame: FrameState
};

/**
 * Add any tests to skip to this array. Will skip all *exact* matches.
 * The signature is: {name: String, side: Side, frame: FrameState}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const skipTests: TestIdentifier[] = [];

/**
 * Add any known failing tests to this array. Will mark all *exact* matches as expected failures.
 * The signature is: {name: String, side: Side, frame: FrameState}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const failingTests: TestIdentifier[] = [];

let fin: Fin;

const windowPositions = [{defaultTop: 300, defaultLeft: 300}, {defaultTop: 300, defaultLeft: 600}];
const windowOptions: fin.WindowOptions[] = windowPositions.map(position => {
    return Object.assign(
        {autoShow: true, saveWindowState: false, defaultHeight: 200, defaultWidth: 200, url: 'http://localhost:1337/demo/frameless-window.html'}, position);
});

/* == Macro Declarations == */

const spawnBasicSnapWindows: SnapDockMacro = async (t: BasicSnapDockTestContext, side: Side, frame: FrameState) => {
    t.context.windows = new Array<_Window>();
    // Create all windows
    for (let i = 0; i < windowOptions.length; i++) {
        const options = Object.assign(windowOptions[i], {frame: !!FrameStateEnum[frame]});
        t.context.windows[i] = await createChildWindow(options);
    }

    // Delay slightly to allow windows to initialize
    await delay(300);
};

const cleanupWindows: SnapDockMacro = async (t: BasicSnapDockTestContext, side: Side, frame: FrameState) => {
    // Close all windows
    await Promise.all(t.context.windows.map(win => win.close()));
};

// Test macro that will snap two windows together, on the specified side
const basicSnapDockMacro: SnapDockMacro = async (t: BasicSnapDockTestContext, side: Side, frame: FrameState) => {
    const windows = t.context.windows;

    // Align windows
    await dragSideToSide(windows[1], opposite(side), windows[0], side);

    // Assert snapped and docked
    await assertAdjacent(windows[0], windows[1], side, t);
    await assertGrouped(windows[0], windows[1], t);

    // Move windows
    await dragWindowTo(windows[0], 700, 700);

    // Assert still docked and adjacent
    await assertAdjacent(windows[0], windows[1], side, t);
    await assertGrouped(windows[0], windows[1], t);
};
basicSnapDockMacro.title = (providedTitle, side, frame) => `${providedTitle} - ${frame} - ${side}`;

/* == Test Execution == */

test.before(async () => {
    fin = await getConnection();
});

test.beforeEach(spawnBasicSnapWindows);

test.afterEach.always(cleanupWindows);

// All tests will be run for framed and frameless windows
(['frameless', 'framed'] as FrameState[]).forEach((frame: FrameState) => {
    // Test snap and dock for each side
    sideArray.forEach((side: Side) => {
        testWrapper('Basic SnapDock Tests', basicSnapDockMacro, side, frame);
    });
});

// Helper function to keep type-safety when invoking tests.
// (If typescript ever supports proper variadic kinds this can be cleaned up a lot)
function testWrapper(name: string, macro: SnapDockMacro, side: Side, frame: FrameState) {
    if (skipTests.some(test => test.name === name && test.side === side && test.frame === frame)) {
        test.skip(name, macro, side, frame);
    } else if (failingTests.some(test => test.name === name && test.side === side && test.frame === frame)) {
        test.failing(name, macro, side, frame);
    } else {
        test(name, macro, side, frame);
    }
}