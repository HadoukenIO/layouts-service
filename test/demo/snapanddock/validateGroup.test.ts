import {test} from 'ava';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAllContiguous, assertGrouped, assertNotGrouped} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {ArrangementsType, defaultArrangements} from '../../provider/utils/WindowInitializer';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {undockWindow} from '../utils/snapServiceUtils';

interface ValidateGroupOptions extends CreateWindowData {
    arrangement: string;
    undockIndex: number;  // Zero-indexed
    remainingGroups: number[][];
    undockBy: 'service'|'runtime';
}

const undockFunctions = {
    'service': async (win: _Window) => {
        return undockWindow(win.identity);
    },
    'runtime': async (win: _Window) => {
        return win.leaveGroup();
    }
};

const customArrangements: ArrangementsType = Object.assign({}, defaultArrangements, {
    9: {
        // 0   4
        //  1 3
        //   2
        //  5 7
        // 6   8

        // 0               4
        //     1       3
        //         2
        //     5       7
        // 6               8
        'x': [
            [0, 'top-left', 0, 'top-left', {x: -80, y: -80}],
            [1, 'top-left', 0, 'bottom-right', {x: 10, y: -98}],
            [2, 'top-left', 1, 'bottom-right', {x: 10, y: -98}],
            [3, 'bottom-left', 2, 'top-right', {x: 10, y: 102}],
            [4, 'bottom-left', 3, 'top-right', {x: 10, y: 102}],
            [5, 'top-right', 2, 'bottom-left', {x: -10, y: -98}],
            [6, 'top-right', 5, 'bottom-left', {x: -10, y: -98}],
            [7, 'top-left', 2, 'bottom-right', {x: 10, y: -98}],
            [8, 'top-left', 7, 'bottom-right', {x: 10, y: -98}],
        ],
        // 0   1       5   6
        //         4
        // 2   3       7   8
        'dumbell': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: 10}],
            [2, 'top-right', 0, 'bottom-right', {x: -10, y: 2}],
            [3, 'top-left', 0, 'bottom-right', {x: 10, y: 2}],
            [4, 'top-left', 1, 'top-right', {x: 2, y: 102}],
            [5, 'top-left', 4, 'top-right', {x: 2, y: -102}],
            [6, 'bottom-left', 5, 'bottom-right', {x: 2, y: 10}],
            [7, 'top-right', 5, 'bottom-right', {x: -10, y: 2}],
            [8, 'top-left', 5, 'bottom-right', {x: 10, y: 2}],
        ]
    }
});

test.afterEach.always(teardown);

testParameterized<ValidateGroupOptions, WindowContext>(
    (testOptions: ValidateGroupOptions): string => `Validate Group - ${testOptions.frame ? 'framed' : 'frameless'} - ${testOptions.windowCount} window ${
        testOptions.arrangement} - window ${testOptions.undockIndex} ungrouped by ${testOptions.undockBy}`,
    [
        {frame: true, undockBy: 'service', windowCount: 3, arrangement: 'line', undockIndex: 1, remainingGroups: [[0], [1], [2]]},
        {frame: true, undockBy: 'service', windowCount: 3, arrangement: 'line', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: true, undockBy: 'service', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 1, remainingGroups: [[0, 2], [1]]},
        {frame: true, undockBy: 'service', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: true, undockBy: 'service', windowCount: 5, arrangement: 'hourglass', undockIndex: 2, remainingGroups: [[0, 1], [2], [3, 4]]},
        {frame: true, undockBy: 'service', windowCount: 9, arrangement: 'dumbell', undockIndex: 4, remainingGroups: [[0, 1, 2, 3], [4], [5, 6, 7, 8]]},
        {frame: true, undockBy: 'service', windowCount: 9, arrangement: 'x', undockIndex: 2, remainingGroups: [[0, 1], [3, 4], [5, 6], [7, 8], [2]]},
        {frame: true, undockBy: 'runtime', windowCount: 3, arrangement: 'line', undockIndex: 1, remainingGroups: [[0], [1], [2]]},
        {frame: true, undockBy: 'runtime', windowCount: 3, arrangement: 'line', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: true, undockBy: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 1, remainingGroups: [[0, 2], [1]]},
        {frame: true, undockBy: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: true, undockBy: 'runtime', windowCount: 5, arrangement: 'hourglass', undockIndex: 2, remainingGroups: [[0, 1], [2], [3, 4]]},
        {frame: true, undockBy: 'runtime', windowCount: 9, arrangement: 'dumbell', undockIndex: 4, remainingGroups: [[0, 1, 2, 3], [4], [5, 6, 7, 8]]},
        {frame: true, undockBy: 'runtime', windowCount: 9, arrangement: 'x', undockIndex: 2, remainingGroups: [[0, 1], [3, 4], [5, 6], [7, 8], [2]]},
        {frame: false, undockBy: 'service', windowCount: 3, arrangement: 'line', undockIndex: 1, remainingGroups: [[0], [1], [2]]},
        {frame: false, undockBy: 'service', windowCount: 3, arrangement: 'line', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: false, undockBy: 'service', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 1, remainingGroups: [[0, 2], [1]]},
        {frame: false, undockBy: 'service', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: false, undockBy: 'service', windowCount: 5, arrangement: 'hourglass', undockIndex: 2, remainingGroups: [[0, 1], [2], [3, 4]]},
        {frame: false, undockBy: 'service', windowCount: 9, arrangement: 'dumbell', undockIndex: 4, remainingGroups: [[0, 1, 2, 3], [4], [5, 6, 7, 8]]},
        {frame: false, undockBy: 'service', windowCount: 9, arrangement: 'x', undockIndex: 2, remainingGroups: [[0, 1], [3, 4], [5, 6], [7, 8], [2]]},
        {frame: false, undockBy: 'runtime', windowCount: 3, arrangement: 'line', undockIndex: 1, remainingGroups: [[0], [1], [2]]},
        {frame: false, undockBy: 'runtime', windowCount: 3, arrangement: 'line', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: false, undockBy: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 1, remainingGroups: [[0, 2], [1]]},
        {frame: false, undockBy: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', undockIndex: 2, remainingGroups: [[0, 1], [2]]},
        {frame: false, undockBy: 'runtime', windowCount: 5, arrangement: 'hourglass', undockIndex: 2, remainingGroups: [[0, 1], [2], [3, 4]]},
        {frame: false, undockBy: 'runtime', windowCount: 9, arrangement: 'dumbell', undockIndex: 4, remainingGroups: [[0, 1, 2, 3], [4], [5, 6, 7, 8]]},
        {frame: false, undockBy: 'runtime', windowCount: 9, arrangement: 'x', undockIndex: 2, remainingGroups: [[0, 1], [3, 4], [5, 6], [7, 8], [2]]},
    ],
    createWindowTest(async (t, testOptions: ValidateGroupOptions) => {
        const windows = t.context.windows;

        await assertGrouped(t, ...windows);
        await assertAllContiguous(t, windows);

        await undockFunctions[testOptions.undockBy](windows[testOptions.undockIndex]);

        // The validation is delayed slightly, to ensure all bounds-changed events have been recieved from modified windows
        // See SERVICE-284 for details.
        await delay(500);

        await assertNotGrouped(windows[testOptions.undockIndex], t);

        for (const group of testOptions.remainingGroups) {
            if (group.length === 1) {
                await assertNotGrouped(windows[group[0]], t);
            } else {
                const groupedWindows = group.map(id => windows[id]);
                await assertGrouped(t, ...groupedWindows);
                await assertAllContiguous(t, groupedWindows);
            }
        }
    }, undefined, customArrangements));
