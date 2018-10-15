import robot from 'robotjs';

import {assertAdjacent, assertGrouped, assertSquare} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {getBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {FrameState, SnapDockTest, TestHelper, TestIdentifier, TestMacroBase, TestOptionsBase} from '../utils/testRunnerUtils';

/**
 * Add any tests to skip to this array. Will skip all *exact* matches.
 * The signature is: {name: string, numWindows: number, frame: FrameState, ...any other params}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const skippedTests: TestIdentifier<ResizeGroupTestOptions>[] = [];

/**
 * Add any known failing tests to this array. Will mark all *exact* matches as expected failures.
 * The signature is: {name: String, side: Side, frame: FrameState}
 *
 * (NOTE: If a test appears in both the skip and failing lists it will be skipped)
 */
const failingTests: TestIdentifier<ResizeGroupTestOptions>[] = [
    // These four are failing because of the win10 frame bounds bug.
    {name: 'Resize SnapGroup Tests', numWindows: 2, frame: 'framed', resizeType: ['inner', 'vertical']} as TestIdentifier<ResizeGroupTestOptions>,
    {name: 'Resize SnapGroup Tests', numWindows: 2, frame: 'framed', resizeType: ['inner', 'horizontal']} as TestIdentifier<ResizeGroupTestOptions>,
    {name: 'Resize SnapGroup Tests', numWindows: 4, frame: 'framed', resizeType: ['inner', 'vertical']} as TestIdentifier<ResizeGroupTestOptions>,
    {name: 'Resize SnapGroup Tests', numWindows: 4, frame: 'framed', resizeType: ['inner', 'horizontal']} as TestIdentifier<ResizeGroupTestOptions>
];

type ResizeType = ['inner' | 'outer', 'vertical' | 'horizontal'];

interface ResizeGroupTestOptions extends TestOptionsBase {
    resizeType: ResizeType;
    numWindows: 2|4;
}
type ResizeGroupMacro = TestMacroBase<ResizeGroupTestOptions>;

const testHelper = new TestHelper<ResizeGroupTestOptions>(skippedTests, failingTests);


const snapGroupResizeTest: ResizeGroupMacro = async (t: SnapDockTest, testOptions: ResizeGroupTestOptions) => {
    const {resizeType, frame, numWindows} = testOptions;

    // Create and arrange the windows based on number of windows and resize type
    const arrangementName = numWindows === 2 ? resizeType[1] : 'square';
    await testHelper.spawnBasicSnapWindows(t, testOptions, arrangementName);

    const windows = t.context.windows;

    // Assert snapped and docked
    await assertGrouped(t, ...windows);
    numWindows === 2 ? await assertAdjacent(t, windows[0], windows[1]) : await assertSquare(t, ...windows);

    // Ensure we are using the right window objects for the test case
    const targetIndeces = [0, 1];
    if (numWindows === 4) {
        targetIndeces[0] = resizeType[0] === 'inner' ? 0 : (resizeType[1] === 'vertical' ? 1 : 2);
        targetIndeces[1] = resizeType[0] === 'outer' ? 3 : (resizeType[1] === 'horizontal' ? 1 : 2);
    }
    const bounds: NormalizedBounds[] = [await getBounds(windows[targetIndeces[0]]), await getBounds(windows[targetIndeces[1]])];
    const combinedCenter = {x: (bounds[1].right - bounds[0].left) / 2 + bounds[0].left, y: (bounds[1].bottom - bounds[0].top) / 2 + bounds[0].top};

    // Resize the windows based on resize type
    switch (resizeType[0]) {
        case 'inner':
            // Drag from the combined center of the two windows across/down to the center of the second windows
            robot.mouseToggle('up');
            robot.moveMouseSmooth(combinedCenter.x, combinedCenter.y);
            robot.mouseToggle('down');
            robot.moveMouseSmooth(bounds[1].left + bounds[1].width / 2, bounds[1].top + bounds[1].height / 2);
            robot.mouseToggle('up');
            // Drag back the other way to test both directions
            await delay(300);
            robot.mouseToggle('down');
            robot.moveMouseSmooth(bounds[0].left + bounds[0].width / 2, bounds[0].top + bounds[0].height / 2);
            robot.mouseToggle('up');
            break;
        case 'outer':
            const startPoint: [number, number] = [combinedCenter.x + bounds[1].width / 2, combinedCenter.y + bounds[1].height / 2];
            robot.mouseToggle('up');
            robot.moveMouseSmooth(startPoint[0], startPoint[1]);
            robot.mouseToggle('down');
            // startPoint + (startPoint-center)
            robot.moveMouseSmooth(startPoint[0] * 2 - bounds[1].left - bounds[1].width / 2, startPoint[1] * 2 - bounds[1].top - bounds[1].height / 2);
            robot.mouseToggle('up');
            break;
        default:
            throw new Error(`Invalid resize type: ${resizeType}. Valid options are of type ['inner | outer', 'vertical' | 'horizontal']`);
    }

    await delay(100);

    // Assert still docked and adjacent
    await assertGrouped(t, ...windows);
    numWindows === 2 ? await assertAdjacent(t, windows[0], windows[1]) : await assertSquare(t, ...windows);
};
snapGroupResizeTest.title = (providedTitle: string, testOptions: ResizeGroupTestOptions): string =>
    `${providedTitle} - ${testOptions.numWindows} windows - ${testOptions.frame} - ${testOptions.resizeType.join('-')} resize`;


// All tests will be run for framed and frameless windows
(['framed', 'frameless'] as FrameState[]).forEach((frame: FrameState) => {
    // Test resizing grouped windows
    [2, 4].forEach(numWindows => {
        ['inner', 'outer'].forEach(first => {
            ['horizontal', 'vertical'].forEach(second => {
                testHelper.runTest('Resize SnapGroup Tests', snapGroupResizeTest, {numWindows, frame, resizeType: [first, second]} as ResizeGroupTestOptions);
            });
        });
    });
});