import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAllContiguous, assertGrouped, assertNotGrouped} from '../../provider/utils/assertions';
import {ArrangementsType, defaultArrangements} from '../../provider/utils/WindowInitializer';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {undockWindow} from '../utils/snapServiceUtils';

interface ValidateGroupOptions extends CreateWindowData {
    arrangement: string;
    windowToUndock: number;  // Zero-indexed
    remainingWindowGroups: number[][];
    undockType: 'service'|'runtime';
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
        'x': [
            [0, 'top-left', 0, 'top-left', {x: -280, y: -280}],
            [1, 'top-left', 0, 'bottom-right', {x: -98, y: 10}],
            [2, 'top-left', 1, 'bottom-right', {x: -98, y: 10}],
            [3, 'bottom-left', 2, 'top-right', {x: -98, y: -10}],
            [4, 'bottom-left', 3, 'top-right', {x: -98, y: -10}],
            [5, 'top-right', 2, 'bottom-left', {x: 102, y: 10}],
            [6, 'top-right', 5, 'bottom-left', {x: 102, y: 10}],
            [7, 'top-left', 2, 'bottom-right', {x: -98, y: 10}],
            [8, 'top-left', 7, 'bottom-right', {x: -98, y: 10}],
        ],
        // 0   1       5   6
        //         4
        // 2   3       7   8
        'dumbell': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-right', 0, 'bottom-right', {x: -10, y: 2}],
            [3, 'top-left', 0, 'bottom-right', {x: 10, y: 2}],
            [4, 'top-left', 1, 'top-right', {x: 2, y: 102}],
            [5, 'top-left', 4, 'top-right', {x: 2, y: -102}],
            [6, 'bottom-left', 5, 'bottom-right', {x: 2, y: -10}],
            [7, 'top-right', 5, 'bottom-right', {x: -10, y: 2}],
            [8, 'top-left', 5, 'bottom-right', {x: 10, y: 2}],
        ]
    }
});

testParameterized<ValidateGroupOptions, WindowContext>(
    'Validate SnapGroup',
    [
        {frame: true, undockType: 'service', windowCount: 3, arrangement: 'line', windowToUndock: 1, remainingWindowGroups: [[0], [1], [2]]},
        {frame: true, undockType: 'service', windowCount: 3, arrangement: 'line', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: true, undockType: 'service', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 1, remainingWindowGroups: [[0, 2], [1]]},
        {frame: true, undockType: 'service', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: true, undockType: 'service', windowCount: 5, arrangement: 'hourglass', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2], [3, 4]]},
        {frame: true, undockType: 'service', windowCount: 9, arrangement: 'dumbell', windowToUndock: 4, remainingWindowGroups: [[0, 1,2,3], [4], [5,6,7,8]]},
        {frame: true, undockType: 'service', windowCount: 9, arrangement: 'x', windowToUndock: 2, remainingWindowGroups: [[0,1],[3,4],[5,6],[7,8],[2]]},

        {frame: true, undockType: 'runtime', windowCount: 3, arrangement: 'line', windowToUndock: 1, remainingWindowGroups: [[0], [1], [2]]},
        {frame: true, undockType: 'runtime', windowCount: 3, arrangement: 'line', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: true, undockType: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 1, remainingWindowGroups: [[0, 2], [1]]},
        {frame: true, undockType: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: true, undockType: 'runtime', windowCount: 5, arrangement: 'hourglass', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2], [3,4]]},
        {frame: true, undockType: 'runtime', windowCount: 9, arrangement: 'dumbell', windowToUndock: 4, remainingWindowGroups: [[0, 1,2,3], [4], [5,6,7,8]]},
        {frame: true, undockType: 'runtime', windowCount: 9, arrangement: 'x', windowToUndock: 2, remainingWindowGroups: [[0,1],[3,4],[5,6],[7,8],[2]]},


        {frame: false, undockType: 'service', windowCount: 3, arrangement: 'line', windowToUndock: 1, remainingWindowGroups: [[0], [1], [2]]},
        {frame: false, undockType: 'service', windowCount: 3, arrangement: 'line', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: false, undockType: 'service', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 1, remainingWindowGroups: [[0, 2], [1]]},
        {frame: false, undockType: 'service', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: false, undockType: 'service', windowCount: 5, arrangement: 'hourglass', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2], [3, 4]]},
        {frame: false, undockType: 'service', windowCount: 9, arrangement: 'dumbell', windowToUndock: 4, remainingWindowGroups: [[0, 1,2,3], [4], [5,6,7,8]]},
        {frame: false, undockType: 'service', windowCount: 9, arrangement: 'x', windowToUndock: 2, remainingWindowGroups: [[0,1],[3,4],[5,6],[7,8],[2]]},
        
        {frame: false, undockType: 'runtime', windowCount: 3, arrangement: 'line', windowToUndock: 1, remainingWindowGroups: [[0], [1], [2]]},
        {frame: false, undockType: 'runtime', windowCount: 3, arrangement: 'line', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: false, undockType: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 1, remainingWindowGroups: [[0, 2], [1]]},
        {frame: false, undockType: 'runtime', windowCount: 3, arrangement: 'vertical-triangle', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2]]},
        {frame: false, undockType: 'runtime', windowCount: 5, arrangement: 'hourglass', windowToUndock: 2, remainingWindowGroups: [[0, 1], [2], [3,4]]},
        {frame: false, undockType: 'runtime', windowCount: 9, arrangement: 'dumbell', windowToUndock: 4, remainingWindowGroups: [[0, 1,2,3], [4], [5,6,7,8]]},
        {frame: false, undockType: 'runtime', windowCount: 9, arrangement: 'x', windowToUndock: 2, remainingWindowGroups: [[0,1],[3,4],[5,6],[7,8],[2]]},
        
    ],
    createWindowTest(async (t, testOptions: ValidateGroupOptions) => {
        const windows = t.context.windows;

        await assertGrouped(t, ...windows);
        await assertAllContiguous(t, windows);

        await undockFunctions[testOptions.undockType](windows[testOptions.windowToUndock]);

        await assertNotGrouped(windows[testOptions.windowToUndock], t);

        for (const group of testOptions.remainingWindowGroups) {
            if (group.length === 1) {
                await assertNotGrouped(windows[group[0]], t);
            } else {
                const groupedWindows = group.map(id => windows[id]);
                await assertGrouped(t, ...groupedWindows);
                await assertAllContiguous(t, groupedWindows);
            }
        }
    }, undefined, customArrangements));
