import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAdjacent, assertGrouped, assertSquare} from '../../provider/utils/assertions';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {opposite, Side} from '../../provider/utils/SideUtils';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {itParameterized} from '../utils/parameterizedTestUtils';

interface TwoWindowTestOptions extends CreateWindowData {
    side: Side;
}

afterEach(teardown);

itParameterized<TwoWindowTestOptions>(
    (testOptions: TwoWindowTestOptions): string => `Basic SnapAndDock - ${testOptions.windowCount} windows - ${testOptions.frame ? 'framed' : 'frameless'} - ${
        testOptions.side ? `- ${testOptions.side}` : ''}`,
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
    createWindowTest(async (context, testOptions: TwoWindowTestOptions) => {
        const windows = context.windows;
        const {side} = testOptions;

        await dragWindowTo(windows[0], 375, 375);
        // Align windows
        await dragSideToSide(windows[1], opposite(side), windows[0], side);

        // Assert snapped and docked
        await assertAdjacent(windows[0], windows[1], side);
        await assertGrouped(windows[0], windows[1]);

        // Move windows
        await dragWindowTo(windows[0], 300, 300);

        // Assert still docked and adjacent
        await assertAdjacent(windows[0], windows[1], side);
        await assertGrouped(windows[0], windows[1]);
    }));


itParameterized<CreateWindowData>(
    (testOptions: CreateWindowData): string => `Basic SnapAndDock - ${testOptions.windowCount} windows - ${testOptions.frame}}`,
    [
        {frame: true, windowCount: 4},
        {frame: false, windowCount: 4},
    ],
    createWindowTest(async context => {
        const windows = context.windows;

        // Snap all four windows together
        await dragSideToSide(windows[1], 'left', windows[0], 'right');
        await dragSideToSide(windows[2], 'top', windows[0], 'bottom');
        await dragSideToSide(windows[3], 'left', windows[2], 'right');

        // Assert snapped and docked
        await assertGrouped(...windows);
        await assertAdjacent(windows[0], windows[1], 'right');
        await assertAdjacent(windows[0], windows[2], 'bottom');
        await assertAdjacent(windows[2], windows[3], 'right');

        // Move windows
        await dragWindowTo(windows[0], 300, 300);

        // Assert still docked and adjacent
        await assertGrouped(...windows);
        await assertSquare(...windows);
    }));