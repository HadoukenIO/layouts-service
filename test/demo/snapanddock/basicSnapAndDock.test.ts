import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAdjacent, assertGrouped, assertSquare} from '../../provider/utils/assertions';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {opposite, Side} from '../../provider/utils/SideUtils';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {testParameterised} from '../utils/parameterizedTestUtils';

interface TwoWindowTestOptions extends CreateWindowData {
    side: Side;
}

testParameterised<TwoWindowTestOptions, WindowContext>(
    (testOptions: TwoWindowTestOptions): string =>
        `Basic SnapAndDock - ${testOptions.windowCount} windows - ${testOptions.frame} ${testOptions.side ? `- ${testOptions.side}` : ''}`,
    [
        {frame: true, windowCount: 2, side: 'top'},
        {frame: true, windowCount: 2, side: 'bottom'},
        {frame: true, windowCount: 2, side: 'left'},
        {frame: true, windowCount: 2, side: 'right'},
        {frame: false, windowCount: 2, side: 'top'},
        {frame: false, windowCount: 2, side: 'bottom'},
        {frame: false, windowCount: 2, side: 'left'},
        {frame: false, windowCount: 2, side: 'right'},
    ],
    createWindowTest(async (t, testOptions: TwoWindowTestOptions) => {
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
    }));


testParameterised<CreateWindowData, WindowContext>(
    (testOptions: CreateWindowData): string => `Basic SnapAndDock - ${testOptions.windowCount} windows - ${testOptions.frame}}`,
    [
        {frame: true, windowCount: 4},
        {frame: false, windowCount: 4},
    ],
    createWindowTest(async t => {
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
    }));