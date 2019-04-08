import {Rect} from 'hadouken-js-adapter/out/types/src/api/system/monitor';
import * as assert from 'power-assert';

import {assertNotTabbed, assertPairTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {dragWindowTo} from '../../provider/utils/dragWindowTo';
import {getBounds, getTabsetBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {itParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';
import {getTabGroupIdentity, getTabGroupState} from '../utils/tabServiceUtils';

interface TabToMaximizedWindowTestOptions extends CreateWindowData {
    windowCount: 2;
    tabTo: 'maximized'|'restored';
}

afterEach(teardown);

itParameterized(
    'When dragging a window on-top another window, windows become tabbed',
    (testOptions) => `frame: ${testOptions.frame}, tabTo: ${testOptions.tabTo}`,
    [
        {frame: true, windowCount: 2, tabTo: 'restored'},
        {frame: true, windowCount: 2, tabTo: 'maximized'},
        {frame: false, windowCount: 2, tabTo: 'restored'},
        {frame: false, windowCount: 2, tabTo: 'maximized'},
    ],
    createWindowTest(async (context, testOptions: TabToMaximizedWindowTestOptions) => {
        const fin = await getConnection();
        const {windows} = context;

        await windows[1].maximize();

        if (testOptions.tabTo === 'maximized') {
            const maximizedBounds: Rect = (await fin.System.getMonitorInfo()).primaryMonitor.availableRect;
            await dragWindowTo(windows[0], maximizedBounds.left + 50, maximizedBounds.top + 30);
            // Windows should have tabbed
            await assertPairTabbed(windows[0], windows[1]);
            // Make sure that the internal state of the tabGroup is correct
            assert.strictEqual(await getTabGroupState(windows[0].identity), 'maximized');
            // TabGroup fills the whole screen
            const groupBounds = await getTabsetBounds(windows[0]);
            for (const side of Object.keys(maximizedBounds) as (keyof Rect)[]) {
                if (maximizedBounds.hasOwnProperty(side)) {
                    assert.strictEqual(maximizedBounds[side], groupBounds[side]);
                }
            }
        } else {
            const restoredBounds: NormalizedBounds = await getBounds(windows[1]);
            await tabWindowsTogether(windows[1], windows[0], false);
            // Windows should not have tabbed
            await Promise.all(windows.map(win => assertNotTabbed(win)));
        }
    }));

itParameterized(
    'When dragging a window on-top another window, restore bounds are preserved',
    (testOptions) => `frame: ${testOptions.frame}`,
    [
        {frame: true, windowCount: 2},
        {frame: false, windowCount: 2},
    ],
    createWindowTest(async (context: WindowContext, testOptions: CreateWindowData) => {
        const fin = await getConnection();
        const {windows} = context;

        // Record pre-maximized bounds
        const beforeTabbingBounds = await getBounds(windows[1]);

        // Maximize the window
        await windows[1].maximize();

        const maximizedBounds: Rect = (await fin.System.getMonitorInfo()).primaryMonitor.availableRect;

        // Create tabgroup from maximized window
        await dragWindowTo(windows[0], maximizedBounds.left + 50, maximizedBounds.top + 30);
        await assertPairTabbed(windows[0], windows[1]);

        // Restore the tabgroup
        const {tabbing} = await layoutsClientPromise;
        const tabGroupIdentity = await getTabGroupIdentity(windows[1].identity);
        await tabbing.restoreTabGroup(tabGroupIdentity!);

        // Record restored bounds
        const afterTabbingBounds = await getTabsetBounds(windows[1]);

        // Check restored bounds equal bounds before maximizing
        assert.deepEqual(beforeTabbingBounds, afterTabbingBounds);
    }));

itParameterized(
    'When dragging a window on-top another window hidden by a maximized window, windows do not become tabbed',
    (testOptions) => `frame: ${testOptions.frame}`,
    [
        {frame: true, windowCount: 3},
        {frame: false, windowCount: 3},
    ],
    createWindowTest(async context => {
        const {windows} = context;

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