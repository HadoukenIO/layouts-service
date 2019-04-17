import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAllMinimizedOrHidden, assertAllNormalState, assertGrouped, assertPairTabbed} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {itParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';
import {getTabstrip} from '../utils/tabServiceUtils';

interface MinimizeTestOptions extends CreateWindowData {
    // Index of the window on which restore is invoked (group will be minimized from index 0)
    restoreIndex: number;
}

afterEach(teardown);

itParameterized(
    'When minimizing and restoring grouped windows, the group is minimized and restored as expected',
    (testOptions: MinimizeTestOptions) => `${testOptions.windowCount} windows - restoring ${testOptions.restoreIndex === 0 ? 'minimized' : 'grouped'} window`,
    [
        {frame: true, windowCount: 2, arrangement: 'horizontal', restoreIndex: 0},
        {frame: true, windowCount: 2, arrangement: 'horizontal', restoreIndex: 1},
        {frame: true, windowCount: 3, arrangement: 'line', restoreIndex: 1}
    ],
    createWindowTest(async (context, testOptions: MinimizeTestOptions) => {
        const {windows} = context;
        const {restoreIndex} = testOptions;

        await windows[0].minimize();
        await delay(500);

        await assertAllMinimizedOrHidden(windows);

        await windows[restoreIndex].restore();
        await delay(500);

        await assertAllNormalState(windows);
    })
);

// With tabsets
itParameterized(
    'When minimizing and restoring grouped, tabbed, windows, the group is minimized and restored as expected',
    (testOptions: MinimizeTestOptions) => `${testOptions.windowCount} windows - restoring ${testOptions.restoreIndex === 0 ? 'minimized' : 'grouped'} window`,
    [{frame: true, windowCount: 4, restoreIndex: 0}, {frame: true, windowCount: 4, restoreIndex: 1}, {frame: true, windowCount: 6, restoreIndex: 1}],
    createWindowTest(async (context, testOptions: MinimizeTestOptions) => {
        const layoutsClient = await layoutsClientPromise;

        const {windows, windowInitializer} = context;
        const {restoreIndex, windowCount} = testOptions;

        const tabStrips: _Window[] = [];
        for (let i = 0; i < windowCount; i += 2) {
            await tabWindowsTogether(windows[i], windows[i + 1]);

            await delay(100);

            await assertPairTabbed(windows[i], windows[i + 1]);

            tabStrips.push(await getTabstrip(windows[i].identity));
        }

        await windowInitializer.arrangeWindows(tabStrips, windowCount === 4 ? 'horizontal' : 'line');
        await assertGrouped(...windows, ...tabStrips);

        await layoutsClient.tabbing.minimizeTabGroup(tabStrips[0].identity);
        await delay(500);

        await assertAllMinimizedOrHidden([...windows, ...tabStrips]);

        await tabStrips[restoreIndex].restore();
        await delay(500);

        await assertAllNormalState([...windows, ...tabStrips]);
        for (let i = 0; i < windowCount; i += 2) {
            await assertPairTabbed(windows[i], windows[i + 1]);
        }
        await assertGrouped(...windows, ...tabStrips);
    })
);
