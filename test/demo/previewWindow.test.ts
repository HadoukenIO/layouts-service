import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as robot from 'robotjs';

import {CreateWindowData, createWindowTest} from '../demo/utils/createWindowTest';
import {testParameterized} from '../demo/utils/parameterizedTestUtils';
import {assertAdjacent} from '../provider/utils/assertions';
import {getConnection} from '../provider/utils/connect';
import {delay} from '../provider/utils/delay';
import {dragWindowAndHover} from '../provider/utils/dragWindowAndHover';
import {dragSideToSide} from '../provider/utils/dragWindowTo';
import {getBounds} from '../provider/utils/getBounds';
import {opposite, Side} from '../provider/utils/SideUtils';
import {tabWindowsTogether} from '../provider/utils/tabWindowsTogether';


interface PreviewTestOptions extends CreateWindowData {
    side: Side;
}

testParameterized(
    (testOptions: PreviewTestOptions): string => `Preview on ${testOptions.side} side`,
    [
        {frame: true, side: 'top', windowCount: 2},
        {frame: true, side: 'bottom', windowCount: 2},
        {frame: true, side: 'left', windowCount: 2},
        {frame: true, side: 'right', windowCount: 2}
    ],
    createWindowTest(async (t, testOptions: PreviewTestOptions) => {
        const {side} = testOptions;
        const {windows} = t.context;

        const fin = await getConnection();
        const previewWin: _Window = await fin.Window.wrap({name: 'previewWindow-', uuid: 'layouts-service'});
        const windowBounds = await Promise.all([getBounds(windows[0]), getBounds(windows[1])]);

        await dragSideToSide(windows[1], opposite(side), windows[0], side, {x: 5, y: 5}, false);

        await assertAdjacent(t, windows[0], previewWin);
        const previewBounds = await getBounds(previewWin);
        robot.mouseToggle('up');

        t.is(windowBounds[1].width, previewBounds.width);
        t.is(windowBounds[1].height, previewBounds.height);
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150}));



interface PreviewResizeTestOptions extends CreateWindowData {
    direction: ['smaller'|'bigger', 'smaller'|'bigger'];
    dimension: 'height'|'width';
}

testParameterized(
    (testOptions: PreviewResizeTestOptions): string =>
        `Preview resize ${testOptions.dimension} on snap - ${testOptions.direction[0]} to ${testOptions.direction[1]}`,
    [
        {frame: true, dimension: 'height', direction: ['bigger', 'smaller'], windowCount: 2},
        {frame: true, dimension: 'height', direction: ['smaller', 'bigger'], windowCount: 2},
        {frame: true, dimension: 'width', direction: ['bigger', 'smaller'], windowCount: 2},
        {frame: true, dimension: 'width', direction: ['smaller', 'bigger'], windowCount: 2},
    ],
    createWindowTest(async (t, testOptions: PreviewResizeTestOptions) => {
        const {dimension, direction} = testOptions;
        const {windows} = t.context;

        const fin = await getConnection();
        const previewWin: _Window = await fin.Window.wrap({name: 'previewWindow-', uuid: 'layouts-service'});
        const windowBounds = await Promise.all([getBounds(windows[0]), getBounds(windows[1])]);

        await windows[1].resizeBy(
            dimension === 'width' ? (direction[0] === 'smaller' ? -50 : 50) : 0,
            dimension === 'height' ? (direction[1] === 'smaller' ? -50 : 50) : 0,
            'top-left');

        dimension === 'height' ? await dragWindowAndHover(windows[1], windowBounds[0].right, windowBounds[0].top) :
                                 await dragWindowAndHover(windows[1], windowBounds[0].left, windowBounds[0].bottom);

        const previewBounds = await getBounds(previewWin);

        robot.mouseToggle('up');

        t.is(previewBounds[dimension], windowBounds[0][dimension]);
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150}));

testParameterized(
    (testOptions: CreateWindowData): string => `Preview tab - ${testOptions.windowCount > 2 ? 'tabbed' : 'single'} window`,
    [
        {frame: true, windowCount: 2},
        {frame: true, windowCount: 3},
    ],
    createWindowTest(async (t, testOptions: CreateWindowData) => {
        const {windowCount} = testOptions;
        const {windows} = t.context;

        const fin = await getConnection();
        const previewWin: _Window = await fin.Window.wrap({name: 'previewWindow-', uuid: 'layouts-service'});
        const windowBounds = await Promise.all([getBounds(windows[0]), getBounds(windows[1])]);

        if (windowCount > 2) {
            // Tab windows together
            await windows[2].moveTo(20, 20);
            await tabWindowsTogether(windows[0], windows[1]);
        }

        await delay(500);

        await dragWindowAndHover(windowCount > 2 ? windows[2] : windows[1], windowBounds[0].left + 10, windowBounds[0].top + 5);

        const previewBounds = await getBounds(previewWin);

        robot.mouseToggle('up');

        t.deepEqual(previewBounds, {...windowBounds[0], height: 60, bottom: windowBounds[0].top + previewBounds.height});
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150}));
