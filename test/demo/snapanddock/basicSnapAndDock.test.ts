import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAdjacent, assertGrouped, assertSquare} from '../../provider/utils/assertions';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {opposite, Side, sideArray} from '../../provider/utils/SideUtils';
import {FrameState, SnapDockTest, TestHelper, TestIdentifier, TestMacroBase, TestOptionsBase} from '../utils/testRunnerUtils';


/**
 * Add any tests to skip to this array. Will skip all *exact* matches.
 * The signature is: {name: string, numWindows: number, frame: FrameState, ...any other params}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const skippedTests: TestIdentifier<BasicTestOptions<number>>[] = [];

/**
 * Add any known failing tests to this array. Will mark all *exact* matches as expected failures.
 * The signature is: {name: String, side: Side, frame: FrameState}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const failingTests: TestIdentifier<BasicTestOptions<number>>[] = [];

type BasicSnapDockMacro<N extends number> = TestMacroBase<BasicTestOptions<N>>;
interface BasicTestOptions<N extends number> extends TestOptionsBase {
    side: N extends 2? Side: undefined;
    numWindows: N;
}


const testHelper = new TestHelper<BasicTestOptions<number>>(skippedTests, failingTests);

/* == Macro Declarations == */
// Test macro that will snap two windows together, on the specified side
const basicSnapDockTest: BasicSnapDockMacro<2> = async (t: SnapDockTest, testOptions: BasicTestOptions<2>) => {
    await testHelper.spawnBasicSnapWindows(t, testOptions);

    const windows = t.context.windows;
    const {side} = testOptions;

    // Align windows
    await dragSideToSide(windows[1], opposite(side), windows[0], side);

    // Assert snapped and docked
    await assertAdjacent(t, windows[0], windows[1], side);
    await assertGrouped(t, windows[0], windows[1]);

    // Move windows
    await dragWindowTo(windows[0], 500, 500);

    // Assert still docked and adjacent
    await assertAdjacent(t, windows[0], windows[1], side);
    await assertGrouped(t, windows[0], windows[1]);
};
basicSnapDockTest.title = (providedTitle: string, testOptions: BasicTestOptions<2>): string =>
    `${providedTitle} - 2 windows - ${testOptions.frame} - ${testOptions.side}`;

// Test macro that snaps four windows together as a square
const fourWindowSnapDockTest: BasicSnapDockMacro<4> = async (t: SnapDockTest, testOptions: BasicTestOptions<4>) => {
    await testHelper.spawnBasicSnapWindows(t, testOptions);
    const windows = t.context.windows;

    // Snap all four windows together
    await dragSideToSide(windows[1], 'left', windows[0], 'right');
    await dragSideToSide(windows[2], 'top', windows[0], 'bottom');
    await dragSideToSide(windows[3], 'left', windows[2], 'right');

    // Assert snapped and docked
    await assertGrouped(t, ...windows);
    await assertAdjacent(t, windows[0], windows[1], 'right');
    await assertAdjacent(t, windows[0], windows[2], 'bottom');
    await assertAdjacent(t, windows[2], windows[3], 'right');

    // Move windows
    await dragWindowTo(windows[0], 500, 500);

    // Assert still docked and adjacent
    await assertGrouped(t, ...windows);
    await assertSquare(t, ...windows);
};
fourWindowSnapDockTest.title = (providedTitle: string, testOptions: BasicTestOptions<4>): string => `${providedTitle} - 4 windows - ${testOptions.frame}`;

/* == Test Execution == */
// All tests will be run for framed and frameless windows
(['framed', 'frameless'] as FrameState[]).forEach((frame: FrameState) => {
    sideArray.forEach((side: Side) => {
        // Test basic snap and dock for each side
        testHelper.runTest('Basic SnapDock Tests', basicSnapDockTest, {numWindows: 2, frame, side} as BasicTestOptions<2>);
    });

    // Test snapping four windows in a square
    testHelper.runTest('Basic SnapDock Tests', fourWindowSnapDockTest, {numWindows: 4, frame} as BasicTestOptions<4>);
});
