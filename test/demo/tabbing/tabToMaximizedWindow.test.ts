import {Rect} from 'hadouken-js-adapter/out/types/src/api/system/monitor';

import {assertNotTabbed, assertTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {dragWindowTo} from '../../provider/utils/dragWindowTo';
import {getBounds, getTabsetBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {getTabGroupState} from '../utils/tabServiceUtils';

interface TabToMaximizedWindowTestOptions extends CreateWindowData {
    windowCount: 2;
    frame: boolean;
    tabTo: 'apparent'|'actual';
}

testParameterized(
    `tab to maximized window`,
    [
        {frame: true, windowCount: 2, tabTo: 'actual'},
        {frame: true, windowCount: 2, tabTo: 'apparent'},
        {frame: false, windowCount: 2, tabTo: 'actual'},
        {frame: false, windowCount: 2, tabTo: 'apparent'},
    ],
    createWindowTest(async (t, options: TabToMaximizedWindowTestOptions) => {
        const fin = await getConnection();
        const {windows} = t.context;

        await windows[1].maximize();

        if (options.tabTo === 'apparent') {
            const apparentBounds: Rect = (await fin.System.getMonitorInfo()).primaryMonitor.availableRect;
            await dragWindowTo(windows[0], apparentBounds.left + 50, apparentBounds.top + 30);
            // Windows should have tabbed
            await assertTabbed(windows[0], windows[1], t);
            // Make sure that the internal state of the tabGroup is correct
            t.is(await getTabGroupState(windows[0].identity), 'maximized');
            // TabGroup fills the whole screen
            const groupBounds = await getTabsetBounds(windows[0]);
            for (const side of Object.keys(apparentBounds) as (keyof Rect)[]) {
                if (apparentBounds.hasOwnProperty(side)) {
                    t.is(apparentBounds[side], groupBounds[side]);
                }
            }
        } else {
            const actualBounds: NormalizedBounds = await getBounds(windows[1]);
            await tabWindowsTogether(windows[1], windows[0]);
            // Windows should not have tabbed
            await Promise.all(windows.map(win => assertNotTabbed(win, t)));
        }
    }));