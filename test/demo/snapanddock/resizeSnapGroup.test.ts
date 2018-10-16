import robot from 'robotjs';
import {assertAdjacent, assertGrouped, assertSquare} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {getBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';

interface ResizeGroupOptions extends CreateWindowData {
    windowCount: 2|4;
    resizeType: ['inner'|'outer', 'vertical'|'horizontal'];
}

testParameterized(
    (testOptions: ResizeGroupOptions): string =>
        `Resize SnapGroup - ${testOptions.windowCount} windows - ${testOptions.frame ? 'framed' : 'frameless'} - ${testOptions.resizeType.join('-')} resize`,
    [
        {frame: true, windowCount: 2, resizeType: ['inner', 'horizontal'], failing: true},
        {frame: true, windowCount: 2, resizeType: ['inner', 'vertical'], failing: true},
        {frame: true, windowCount: 2, resizeType: ['outer', 'horizontal']},
        {frame: true, windowCount: 2, resizeType: ['outer', 'vertical']},
        {frame: true, windowCount: 4, resizeType: ['inner', 'horizontal'], failing: true},
        {frame: true, windowCount: 4, resizeType: ['inner', 'vertical'], failing: true},
        {frame: true, windowCount: 4, resizeType: ['outer', 'horizontal']},
        {frame: true, windowCount: 4, resizeType: ['outer', 'vertical']},
        {frame: false, windowCount: 2, resizeType: ['inner', 'horizontal']},
        {frame: false, windowCount: 2, resizeType: ['inner', 'vertical']},
        {frame: false, windowCount: 2, resizeType: ['outer', 'horizontal']},
        {frame: false, windowCount: 2, resizeType: ['outer', 'vertical']},
        {frame: false, windowCount: 4, resizeType: ['inner', 'horizontal']},
        {frame: false, windowCount: 4, resizeType: ['inner', 'vertical']},
        {frame: false, windowCount: 4, resizeType: ['outer', 'horizontal']},
        {frame: false, windowCount: 4, resizeType: ['outer', 'vertical']},
    ],
    createWindowTest(async (t, testOptions: ResizeGroupOptions) => {
        const {resizeType, windowCount} = testOptions;
        const {windows, windowInitializer} = t.context;

        // Create and arrange the windows based on number of windows and resize type
        const arrangementName = windowCount === 2 ? resizeType[1] : 'square';
        await windowInitializer.arrangeWindows(windows, arrangementName);

        // Assert snapped and docked
        await assertGrouped(t, ...windows);
        windowCount === 2 ? await assertAdjacent(t, windows[0], windows[1]) : await assertSquare(t, ...windows);

        // Ensure we are using the right window objects for the test case
        const targetIndices = [0, 1];
        if (windowCount === 4) {
            targetIndices[0] = resizeType[0] === 'inner' ? 0 : (resizeType[1] === 'vertical' ? 1 : 2);
            targetIndices[1] = resizeType[0] === 'outer' ? 3 : (resizeType[1] === 'horizontal' ? 1 : 2);
        }
        const bounds: NormalizedBounds[] = [await getBounds(windows[targetIndices[0]]), await getBounds(windows[targetIndices[1]])];
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
        windowCount === 2 ? await assertAdjacent(t, windows[0], windows[1]) : await assertSquare(t, ...windows);
    }));