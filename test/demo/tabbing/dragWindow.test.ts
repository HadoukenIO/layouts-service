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
    (testOptions: CreateWindowData): string => `Drag Overlay Correct Size`,
    [{frame: true, windowCount: 2}],
    createWindowTest(async (t, testOptions: CreateWindowData) => {
        const {windowCount} = testOptions;
        const {windows} = t.context;

        const fin = await getConnection();
        const dragWindow: _Window = await fin.Window.wrap({name: 'TabbingDragWindow', uuid: 'layouts-service'});

        await tabWindowsTogether(windows[0], windows[1]);

        const bounds = await getBounds(windows[0]);
        await tearoutToPoint(await getTabstrip(windows[0].identity), 1, {x: bounds.right! + 50, y: bounds.bottom! + 50}, true);

        const dragWindowBounds = await getBounds(dragWindow);
        const {virtualScreen} = await fin.System.getMonitorInfo();

        robot.mouseToggle('up');

        await windows[0].close();
        await windows[1].close();

        t.deepEqual(
            {
                left: virtualScreen.left,
                top: virtualScreen.top,
                width: Math.abs(virtualScreen.left - virtualScreen.right),
                height: Math.abs(virtualScreen.top - virtualScreen.bottom)
            },
            {left: dragWindowBounds.left, top: dragWindowBounds.top, width: dragWindowBounds.width, height: dragWindowBounds.height});
    }, {defaultCentered: true, defaultWidth: 250, defaultHeight: 150}));