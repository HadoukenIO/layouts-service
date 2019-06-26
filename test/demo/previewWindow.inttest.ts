import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as assert from 'power-assert';
import robot from 'robotjs';

import {CreateWindowData, createWindowTest} from '../demo/utils/createWindowTest';
import {itParameterized} from '../demo/utils/parameterizedTestUtils';
import {assertAdjacent} from '../provider/utils/assertions';
import {delay} from '../provider/utils/delay';
import {dragWindowAndHover} from '../provider/utils/dragWindowAndHover';
import {dragSideToSide} from '../provider/utils/dragWindowTo';
import {getBounds} from '../provider/utils/getBounds';
import {opposite, Side} from '../provider/utils/SideUtils';
import {tabWindowsTogether} from '../provider/utils/tabWindowsTogether';
import {teardown} from '../teardown';

import {fin} from './utils/fin';
import {getTabstrip} from './utils/tabServiceUtils';
import {tearoutToOtherTabstrip, tearoutToPoint} from './utils/tabstripUtils';
import {OverlayValidKey} from './utils/previewWindowUtils';


afterEach(teardown);

interface PreviewTestOptions extends CreateWindowData {
    side: Side;
}

itParameterized(
    'When docking windows, preview window appears on correct side',
    (testOptions: PreviewTestOptions): string => `Preview on ${testOptions.side} side`,
    [
        {frame: true, side: 'top', windowCount: 2},
        {frame: true, side: 'bottom', windowCount: 2},
        {frame: true, side: 'left', windowCount: 2},
        {frame: true, side: 'right', windowCount: 2}
    ],
    createWindowTest(async (context, testOptions: PreviewTestOptions) => {
        const {windows} = context;
        const {side} = testOptions;

        const previewWin: _Window = await fin.Window.wrap({name: `preview-snap-${OverlayValidKey.VALID}`, uuid: 'layouts-service'});
        const windowBounds = await Promise.all([getBounds(windows[0]), getBounds(windows[1])]);

        await dragSideToSide(windows[1], opposite(side), windows[0], side, {x: 5, y: 5}, false);

        await assertAdjacent(windows[0], previewWin);
        const previewBounds = await getBounds(previewWin);
        robot.mouseToggle('up');

        assert.strictEqual(windowBounds[1].width, previewBounds.width);
        assert.strictEqual(windowBounds[1].height, previewBounds.height);
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150})
);



interface PreviewResizeTestOptions extends CreateWindowData {
    direction: ['smaller' | 'bigger', 'smaller' | 'bigger'];
    dimension: 'height' | 'width';
}

itParameterized(
    'When docking a window such that the window are resized, preview window appears correct size',
    (testOptions: PreviewResizeTestOptions): string =>
        `Preview resize ${testOptions.dimension} on snap - ${testOptions.direction[0]} to ${testOptions.direction[1]}`,
    [
        {frame: true, dimension: 'height', direction: ['bigger', 'smaller'], windowCount: 2},
        {frame: true, dimension: 'height', direction: ['smaller', 'bigger'], windowCount: 2},
        {frame: true, dimension: 'width', direction: ['bigger', 'smaller'], windowCount: 2},
        {frame: true, dimension: 'width', direction: ['smaller', 'bigger'], windowCount: 2}
    ],
    createWindowTest(async (context, testOptions: PreviewResizeTestOptions) => {
        const {dimension, direction} = testOptions;
        const {windows} = context;

        const previewWin: _Window = await fin.Window.wrap({name: `preview-snap-${OverlayValidKey.VALID}`, uuid: 'layouts-service'});
        const windowBounds = await Promise.all([getBounds(windows[0]), getBounds(windows[1])]);

        await windows[1].resizeBy(
            dimension === 'width' ? (direction[0] === 'smaller' ? -50 : 50) : 0,
            dimension === 'height' ? (direction[1] === 'smaller' ? -50 : 50) : 0,
            'top-left'
        );

        dimension === 'height' ? await dragWindowAndHover(windows[1], windowBounds[0].right, windowBounds[0].top) :
            await dragWindowAndHover(windows[1], windowBounds[0].left, windowBounds[0].bottom);

        const previewBounds = await getBounds(previewWin);

        robot.mouseToggle('up');

        assert.strictEqual(previewBounds[dimension], windowBounds[0][dimension]);
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150})
);

itParameterized(
    'When tabbing a window, preview window appears correct size and position',
    (testOptions: CreateWindowData): string => `Preview tab - ${testOptions.windowCount > 2 ? 'tabbed' : 'single'} window`,
    [
        {frame: true, windowCount: 2},
        {frame: true, windowCount: 3}
    ],
    createWindowTest(async (context, testOptions: CreateWindowData) => {
        const {windowCount} = testOptions;
        const {windows} = context;

        const previewWin: _Window = await fin.Window.wrap({name: `preview-tab-${OverlayValidKey.VALID}`, uuid: 'layouts-service'});
        const windowBounds = await Promise.all([getBounds(windows[0]), getBounds(windows[1])]);

        if (windowCount > 2) {
            // Tab windows together
            await windows[2].moveTo(20, 20);
            await tabWindowsTogether(windows[0], windows[1]);
        }

        await delay(1000);

        await dragWindowAndHover(windowCount > 2 ? windows[2] : windows[1], windowBounds[0].left + 10, windowBounds[0].top + 5);

        const previewBounds = await getBounds(previewWin);

        robot.mouseToggle('up');

        assert.deepEqual(previewBounds, {...windowBounds[0], height: 60, bottom: windowBounds[0].top + previewBounds.height});
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150})
);

itParameterized(
    'When dragging a tab from one window to another, preview window appears correct size and position',
    (testOptions: CreateWindowData): string => `Preview tab drag ${testOptions.windowCount > 3 ? 'tabbed' : 'single'} window`,
    [{frame: true, windowCount: 3}, {frame: true, windowCount: 4}],
    createWindowTest(async (context, testOptions: CreateWindowData) => {
        const {windowCount} = testOptions;
        const {windows} = context;

        const previewWin: _Window = await fin.Window.wrap({name: `preview-tab-${OverlayValidKey.VALID}`, uuid: 'layouts-service'});

        await windows[0].moveTo(40, 40);
        if (windowCount > 3) await windows[3].moveTo(60, 60);

        const windowBounds = await Promise.all([getBounds(windows[0])]);

        await tabWindowsTogether(windows[1], windows[2]);

        if (windowCount > 3) {
            await tabWindowsTogether(windows[0], windows[3]);
            await tearoutToOtherTabstrip(await getTabstrip(windows[2].identity), 1, await getTabstrip(windows[0].identity), true);
        } else {
            await tearoutToPoint(await getTabstrip(windows[2].identity), 1, {x: windowBounds[0].left + 20, y: windowBounds[0].top + 20}, true);
        }

        const previewBounds = await getBounds(previewWin);
        robot.mouseToggle('up');

        assert.deepEqual(previewBounds, {...windowBounds[0], height: 60, bottom: windowBounds[0].top + previewBounds.height});
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150})
);
