import {test} from 'ava';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import robot from 'robotjs';

import {CreateWindowData, createWindowTest} from '../../demo/utils/createWindowTest';
import {testParameterized} from '../../demo/utils/parameterizedTestUtils';
import {getConnection} from '../../provider/utils/connect';
import {getBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {getTabstrip} from '../utils/tabServiceUtils';
import {tearoutToPoint} from '../utils/tabstripUtils';


test.afterEach.always(teardown);

testParameterized(
    (testOptions: CreateWindowData): string => `DragWindow matches virtualScreen size`,
    [{frame: true, windowCount: 2}],
    createWindowTest(async (t, testOptions: CreateWindowData) => {
        const {windowCount} = testOptions;
        const {windows} = t.context;

        const fin = await getConnection();
        const dragWindow: _Window = await fin.Window.wrap({name: 'TabbingDragWindow', uuid: 'layouts-service'});

        await tabWindowsTogether(windows[0], windows[1]);

        const bounds = await getBounds(windows[0]);
        await tearoutToPoint(await getTabstrip(windows[0].identity), 1, {x: bounds.right! + 50, y: bounds.bottom! + 50}, true);

        const [dragWindowBounds, virtualScreen] = await Promise.all([getBounds(dragWindow), fin.System.getMonitorInfo()]);

        robot.mouseToggle('up');

        t.deepEqual(virtualScreen, Object.assign(virtualScreen, dragWindowBounds));
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150}));