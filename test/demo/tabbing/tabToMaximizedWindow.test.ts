import {Rect} from 'hadouken-js-adapter/out/types/src/api/system/monitor';

import {assertNotTabbed, assertPairTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {dragWindowTo} from '../../provider/utils/dragWindowTo';
import {getBounds, getTabsetBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {getTabGroupState} from '../utils/tabServiceUtils';

interface TabToMaximizedWindowTestOptions extends CreateWindowData {
    windowCount: 2;
    tabTo: 'maximized'|'restored';
}

testParameterized(
    `Tab to maximized window`,
    [
        {frame: true, windowCount: 2, tabTo: 'restored'},
        {frame: true, windowCount: 2, tabTo: 'maximized'},
        {frame: false, windowCount: 2, tabTo: 'restored'},
        {frame: false, windowCount: 2, tabTo: 'maximized'},
    ],
    createWindowTest(async (t, options: TabToMaximizedWindowTestOptions) => {
        const fin = await getConnection();
        const {windows} = t.context;

        await windows[1].maximize();

        if (options.tabTo === 'maximized') {
            const maximizedBounds: Rect = (await fin.System.getMonitorInfo()).primaryMonitor.availableRect;
            await dragWindowTo(windows[0], maximizedBounds.left + 50, maximizedBounds.top + 30);
            // Windows should have tabbed
            await assertPairTabbed(windows[0], windows[1]);
            // Make sure that the internal state of the tabGroup is correct
            t.is(await getTabGroupState(windows[0].identity), 'maximized');
            // TabGroup fills the whole screen
            const groupBounds = await getTabsetBounds(windows[0]);
            for (const side of Object.keys(maximizedBounds) as (keyof Rect)[]) {
                if (maximizedBounds.hasOwnProperty(side)) {
                    t.is(maximizedBounds[side], groupBounds[side]);
                }
            }
        } else {
            const restoredBounds: NormalizedBounds = await getBounds(windows[1]);
            await tabWindowsTogether(windows[1], windows[0], false);
            // Windows should not have tabbed
            await Promise.all(windows.map(win => assertNotTabbed(win)));
        }
    }));


testParameterized(
    `Cannot tab to window hidden by maximized window`,
    [
        {frame: true, windowCount: 3},
        {frame: false, windowCount: 3},
    ],
    createWindowTest(async t => {
        const {windows} = t.context;

        await windows[2].moveBy(200, 200);
        await windows[1].maximize();

        // Stack the windows in z-order from top to bottom: 0 - 1 (maximized) - 2
        await windows[2].setAsForeground();
        await windows[1].setAsForeground();
        await windows[0].setAsForeground();

        await tabWindowsTogether(windows[2], windows[0], false);

        // None of the windows should be tabbed
        await Promise.all(windows.map(win => assertNotTabbed(win)));
    }));