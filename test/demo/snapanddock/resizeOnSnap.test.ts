import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import * as SideUtils from '../../provider/utils/SideUtils';
import {Side} from '../../provider/utils/SideUtils';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';

interface ResizeOnSnapOptions extends CreateWindowData {
    side: Side;
    resizeDirection: 'small-to-big'|'big-to-small';
    windowCount: 2;
}

testParameterized(
    (testOptions: ResizeOnSnapOptions): string =>
        `Resize on Snap - 2 windows - ${testOptions.frame} - ${testOptions.resizeDirection.split('-').join(' ')} - ${testOptions.side}`,
    [
        {frame: true, windowCount: 2, resizeDirection: 'big-to-small', side: 'right'},
        {frame: true, windowCount: 2, resizeDirection: 'big-to-small', side: 'bottom'},
        {frame: true, windowCount: 2, resizeDirection: 'small-to-big', side: 'right'},
        {frame: true, windowCount: 2, resizeDirection: 'small-to-big', side: 'bottom'},
        {frame: false, windowCount: 2, resizeDirection: 'big-to-small', side: 'right'},
        {frame: false, windowCount: 2, resizeDirection: 'big-to-small', side: 'bottom'},
        {frame: false, windowCount: 2, resizeDirection: 'small-to-big', side: 'right'},
        {frame: false, windowCount: 2, resizeDirection: 'small-to-big', side: 'bottom'},
    ],
    createWindowTest(async (t, testOptions: ResizeOnSnapOptions) => {
        const {resizeDirection, side} = testOptions;
        const windows = t.context.windows;

        // Resize the second window based on the test params
        if (resizeDirection === 'big-to-small') {
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
    }));
