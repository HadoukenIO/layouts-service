import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAdjacent, assertGrouped, assertNotGrouped} from '../../provider/utils/assertions';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {TestMacro, testParameterized} from '../utils/parameterizedTestUtils';
import {undockWindow} from '../utils/snapServiceUtils';

interface ValidateGroupOptions extends CreateWindowData {
    arrangement: string;
    windowToUndock: number;  // Zero-indexed
    remainingWindowGroups: number[][];
}

testParameterized<ValidateGroupOptions, WindowContext>(
    'Validate SnapGroup',
    [{frame: true, windowCount: 3, arrangement: 'line', windowToUndock: 1, remainingWindowGroups: [[0], [2]]}],
    createWindowTest(async (t, testOptions: ValidateGroupOptions) => {
        const windows = t.context.windows;

        await assertGrouped(t, ...windows);
        await assertAdjacent(t, windows[0], windows[1]);
        await assertAdjacent(t, windows[1], windows[2]);

        await undockWindow(windows[testOptions.windowToUndock].identity);

        await assertNotGrouped(windows[testOptions.windowToUndock], t);

        for (const group of testOptions.remainingWindowGroups) {
            if (group.length === 1) {
                await assertNotGrouped(windows[group[0]], t);
            } else {
                const groupedWindows = group.map(id => windows[id]);
                await assertGrouped(t, ...groupedWindows);
            }
        }
    }));