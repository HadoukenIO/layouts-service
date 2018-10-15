import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import {Side} from '../../provider/utils/getDistanceBetween';
import * as SideUtils from '../../provider/utils/SideUtils';
import {FrameState, SnapDockTest, TestHelper, TestIdentifier, TestMacroBase, TestOptionsBase} from '../utils/testRunnerUtils';

/**
 * Add any tests to skip to this array. Will skip all *exact* matches.
 * The signature is: {name: string, numWindows: number, frame: FrameState, ...any other params}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const skippedTests: TestIdentifier<ResizeOnSnapOptions>[] = [];

/**
 * Add any known failing tests to this array. Will mark all *exact* matches as expected failures.
 * The signature is: {name: String, side: Side, frame: FrameState}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const failingTests: TestIdentifier<ResizeOnSnapOptions>[] = [];

interface ResizeOnSnapOptions extends TestOptionsBase {
    side: Side;
    sizes: 'small-to-big'|'big-to-small';
}
type ResizeOnSnapMacro = TestMacroBase<ResizeOnSnapOptions>;

const testHelper = new TestHelper<ResizeOnSnapOptions>(skippedTests, failingTests);

/**
 * Test Macro that will snap two windows of different but similar size together and check they resize.
 */
const resizeOnSnapTest: ResizeOnSnapMacro = async (t: SnapDockTest, testOptions: ResizeOnSnapOptions) => {
    const {sizes, side} = testOptions;

    await testHelper.spawnBasicSnapWindows(t, testOptions);
    const windows = t.context.windows;

    // Resize the second window based on the test params
    if (sizes === 'big-to-small') {
        await windows[1].resizeBy(50, 50, 'top-left');
    } else {
        await windows[1].resizeBy(-50, -50, 'top-left');
    }

    // Snap the windows together
    await dragSideToSide(windows[1], SideUtils.opposite(side), windows[0], side);

    // Assert snapped and docked
    await assertAdjacent(t, windows[0], windows[1], side);
    await assertGrouped(t, windows[0], windows[1]);

    // Check that the windows are now the same width/height (depending on side)
    const bounds = [await getBounds(windows[0]), await getBounds(windows[1])];
    if (side === 'top' || side === 'bottom') {
        t.is(bounds[0].left, bounds[1].left);
        t.is(bounds[0].right, bounds[1].right);
    } else {
        t.is(bounds[0].top, bounds[1].top);
        t.is(bounds[0].bottom, bounds[1].bottom);
    }
};
resizeOnSnapTest.title = (providedTitle: string, testOptions: ResizeOnSnapOptions): string =>
    `${providedTitle} - 2 windows - ${testOptions.frame} - ${testOptions.sizes.split('-').join(' ')} - ${testOptions.side}`;


// All tests will be run for framed and frameless windows
(['framed', 'frameless'] as FrameState[]).forEach((frame: FrameState) => {
    // Test that windows resize when snapped
    (['big-to-small', 'small-to-big'] as ResizeOnSnapOptions['sizes'][]).forEach((sizes) => {
        (['right', 'bottom'] as Side[]).forEach((side: Side) => {
            testHelper.runTest('Resize on Snap Tests', resizeOnSnapTest, {numWindows: 2, frame, side, sizes} as ResizeOnSnapOptions);
        });
    });
});