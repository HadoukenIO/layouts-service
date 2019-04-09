import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as assert from 'power-assert';
import robot from 'robotjs';

import {CreateWindowData, createWindowTest} from '../../demo/utils/createWindowTest';
import {itParameterized} from '../../demo/utils/parameterizedTestUtils';
import {getConnection} from '../../provider/utils/connect';
import {getBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {getTabstrip} from '../utils/tabServiceUtils';
import {tearoutToPoint} from '../utils/tabstripUtils';


afterEach(teardown);

itParameterized(
    'When a tab is torn-out, TabbingDragWindow fills the screen',
    (testOptions: CreateWindowData): string => `windowCount: ${testOptions.windowCount}, frame:${testOptions.frame}`,
    [{frame: true, windowCount: 2}],
    createWindowTest(async (context, testOptions: CreateWindowData) => {
        const {windows} = context;

        const fin = await getConnection();
        const dragWindow: _Window = await fin.Window.wrap({name: 'TabbingDragWindow', uuid: 'layouts-service'});

        await tabWindowsTogether(windows[0], windows[1]);

        const bounds = await getBounds(windows[0]);
        await tearoutToPoint(await getTabstrip(windows[0].identity), 1, {x: bounds.right! + 50, y: bounds.bottom! + 50}, true);

        const [dragWindowBounds, virtualScreen] = await Promise.all([getBounds(dragWindow), fin.System.getMonitorInfo()]);

        robot.mouseToggle('up');

        assert.deepEqual(virtualScreen, Object.assign(virtualScreen, dragWindowBounds));
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150})
);
