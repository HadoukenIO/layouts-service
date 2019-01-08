import {assertAllMinimized, assertAllRestored, assertTabbed, assertGrouped} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import { tabWindowsTogether } from '../../provider/utils/tabWindowsTogether';
import { _Window } from 'hadouken-js-adapter/out/types/src/api/window/window';
import { getTabstrip } from '../utils/tabServiceUtils';
import { layoutsClientPromise } from '../utils/serviceUtils';
import * as Sinon from 'sinon';

interface MinimizeTestOptions extends CreateWindowData {
    // Index of the window on which restore is invoked (group will be minimized from index 0)
    restoreIndex: number;
}

testParameterized(
    (testOptions: MinimizeTestOptions) =>
        `Minimize and restore - ${testOptions.windowCount} windows - restoring ${testOptions.restoreIndex === 0 ? 'minimized' : 'grouped'} window`,
    [
        {frame: true, windowCount: 2, arrangement: 'horizontal', restoreIndex: 0},
        {frame: true, windowCount: 2, arrangement: 'horizontal', restoreIndex: 1},
        {frame: true, windowCount: 3, arrangement: 'line', restoreIndex: 1}
    ],
    createWindowTest(async (t, testOptions: MinimizeTestOptions) => {
        const {windows} = t.context;
        const {windowCount, restoreIndex} = testOptions;
        
        await windows[0].minimize();
        await delay(500);
        
        await assertAllMinimized(t, windows);

        await windows[restoreIndex].restore();
        await delay(500);

        await assertAllRestored(t, windows);
    }));

// With tabsets
testParameterized(
    (testOptions: MinimizeTestOptions) =>
        `Minimize and restore (snapped tabs) - ${testOptions.windowCount} windows - restoring ${testOptions.restoreIndex === 0 ? 'minimized' : 'grouped'} window`,
    [
        {frame: true, windowCount: 4, restoreIndex: 0},
        {frame: true, windowCount: 4, restoreIndex: 1},
        {frame: true, windowCount: 6, restoreIndex: 1}
    ],
    createWindowTest(async (t, testOptions: MinimizeTestOptions) => {
        const layoutsClient = await layoutsClientPromise;

        const {windows, windowInitializer} = t.context;
        const {restoreIndex, windowCount} = testOptions;

        const tabStrips: _Window[] = [];
        for (let i = 0; i < windowCount; i+=2) {
            await tabWindowsTogether(windows[i], windows[i+1]);

            await delay(100);

            await assertTabbed(windows[i], windows[i+1], t);

            tabStrips.push(await getTabstrip(windows[i].identity));
        }
        
        await windowInitializer.arrangeWindows(tabStrips, windowCount === 4? 'horizontal' : 'line');
        await assertGrouped(t, ...windows, ...tabStrips);
        
        await layoutsClient.minimizeTabGroup(tabStrips[0].identity);
        await delay(500);
        
        await assertAllMinimized(t, [...windows, ...tabStrips]);
        
        await tabStrips[restoreIndex].restore();
        await delay(500);
        
        await assertAllRestored(t, [...windows, ...tabStrips]);
        for (let i = 0; i < windowCount; i+=2) {
            await assertTabbed(windows[i], windows[i+1], t);
        }
        await assertGrouped(t, ...windows, ...tabStrips);
    }));