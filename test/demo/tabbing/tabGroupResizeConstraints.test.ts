import {test, TestContext} from 'ava';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertAllTabbed, assertNotTabbed, assertTabbed} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {Side, sideArray} from '../../provider/utils/SideUtils';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {Constraints} from '../snapanddock/resizeOnSnap.test';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {refreshWindowState} from '../utils/modelUtils';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';
import { getTabGroupState } from '../utils/tabServiceUtils';

interface TabConstraintsOptions extends CreateWindowData {
    windowConstraints: Constraints[];
}

testParameterized(
    'Constraints applied and restored correctly when tabbing',
    [
        {frame: true, windowCount: 2, windowConstraints: [{resizable: false}, {}]},
        {frame: true, windowCount: 2, windowConstraints: [{maxHeight: 500, minWidth: 100}, {}]},
        {
            frame: true,
            windowCount: 3,
            windowConstraints: [
                {resizeRegion: {sides: {top: false, left: false, bottom: true, right: true}}},
                {resizeRegion: {sides: {top: true, left: true, bottom: false, right: false}}},
                {}
            ]
        },
        {
            frame: true,
            windowCount: 3,
            windowConstraints: [{resizeRegion: {sides: {top: false, left: false, bottom: true, right: true}}}, {resizable: false}, {}]
        },
    ],
    createWindowTest(async (t, options: TabConstraintsOptions) => {
        const layoutsClient = await layoutsClientPromise;
        const {tabbing} = layoutsClient;

        const windows = t.context.windows;

        await Promise.all(windows.map((win, index) => win.updateOptions(options.windowConstraints[index])));
        await Promise.all(windows.map((win) => refreshWindowState(win.identity)));

        const startingState = await Promise.all(windows.map(win => getNormalizedConstraints(win)));

        // Tab the windows
        await tabbing.createTabGroup(windows.map(win => win.identity));

        await delay(1000);

        await assertAllTabbed(t, ...windows);

        const resultingConstraints = constraintsUnion(...options.windowConstraints);

        // Check constraints applied to all tabs
        for (let i = 0; i < windows.length; i++) {
            const windowOptions: Required<Constraints> = await getNormalizedConstraints(windows[i]);
            assertConstraintsMatch(resultingConstraints, windowOptions, t);
        }

        // Untab the windows
        for (let i = 1; i < windows.length; i++) {
            await tabbing.removeTab(windows[i].identity);
        }

        await delay(200);

        // Check constraints correctly reverted to original values
        for (let i = 0; i < windows.length; i++) {
            const finalState = await getNormalizedConstraints(windows[i]);

            assertConstraintsMatch(startingState[i], finalState, t);
        }
    }));

testParameterized(
    'Cannot tab windows with incompatible constraints',
    [
        {frame: true, windowCount: 2, windowConstraints: [{resizable: false}, {}]},
        {frame: true, windowCount: 2, windowConstraints: [{maxHeight: 200, minWidth: 250}, {}]},
    ],
    createWindowTest(async (t, options: TabConstraintsOptions) => {
        const windows = t.context.windows;

        await Promise.all(windows.map((win, index) => win.updateOptions(options.windowConstraints[index])));
        await Promise.all(windows.map((win) => refreshWindowState(win.identity)));

        await windows[1].resizeBy(-20, -20, 'top-left');

        await tabWindowsTogether(windows[1], windows[0]);
        await delay(1000);

        await assertNotTabbed(windows[0], t);
        await assertNotTabbed(windows[1], t);
    }));

const defaultConstraints: Required<Constraints> = {
    maxHeight: -1,
    maxWidth: -1,
    minHeight: 0,
    minWidth: 0,
    resizable: true,
    resizeRegion: {
        sides: {
            top: true,
            bottom: true,
            left: true,
            right: true,
        }
    }
};

testParameterized(
    `Cannot maximize tabset when tab has maxWidth/Height`,
    [
        {frame: true, windowCount: 2, windowConstraints: [{}, {}]},
        {frame: true, windowCount: 2, windowConstraints: [{}, {maxHeight: 500}]},
        {frame: true, windowCount: 2, windowConstraints: [{}, {maxWidth: 500}]},
    ],
    createWindowTest(async (t, options: TabConstraintsOptions) => {
        const {tabbing} = await layoutsClientPromise;
        const windows = t.context.windows;

        await Promise.all(windows.map((win, index) => win.updateOptions(options.windowConstraints[index])));
        await Promise.all(windows.map((win) => refreshWindowState(win.identity)));

        await tabWindowsTogether(windows[0], windows[1]);
        await assertTabbed(windows[0], windows[1], t);

        if (options.windowConstraints[1].maxHeight || options.windowConstraints[1].maxWidth) {
            await t.throws(tabbing.maximizeTabGroup(windows[0].identity));
        } else {
            await t.notThrows(tabbing.maximizeTabGroup(windows[0].identity));
            t.is(await getTabGroupState(windows[0].identity), 'maximized');
        }
    }));

function assertConstraintsMatch(expected: Constraints, actual: Constraints, t: TestContext): void {
    for (const key of Object.keys(defaultConstraints) as (keyof Constraints)[]) {
        if (actual.hasOwnProperty(key) && expected.hasOwnProperty(key)) {
            if (typeof actual[key] === 'object') {
                t.deepEqual(
                    expected[key], actual[key], `${key} does not match. Expected: ${JSON.stringify(expected[key])}. Received: ${JSON.stringify(actual[key])}`);
            } else {
                t.is(expected[key], actual[key], `${key} does not match. Expected: ${expected[key]}. Received ${actual[key]}`);
            }
        }
    }
}

async function getNormalizedConstraints(win: _Window): Promise<Required<Constraints>> {
    return win.getOptions().then((options: Required<Constraints>) => {
        return constraintsUnion(options);
    });
}

function constraintsUnion(...windowConstraints: Constraints[]): Required<Constraints> {
    const result: Required<Constraints> = {...defaultConstraints};

    result.minWidth = Math.max(...windowConstraints.map(constraint => constraint.minWidth || 0));
    result.minHeight = Math.max(...windowConstraints.map(constraint => constraint.minHeight || 0));
    result.maxWidth =
        Math.min(...windowConstraints.map(constraint => (!constraint.maxWidth || constraint.maxWidth < 0) ? Number.MAX_SAFE_INTEGER : constraint.maxWidth));
    result.maxHeight =
        Math.min(...windowConstraints.map(constraint => (!constraint.maxHeight || constraint.maxHeight < 0) ? Number.MAX_SAFE_INTEGER : constraint.maxHeight));

    result.resizable = windowConstraints.map(constraint => constraint.resizable || constraint.resizable === undefined).every(val => val);

    result.resizeRegion = defaultConstraints.resizeRegion;
    sideArray.forEach(side => {
        result.resizeRegion.sides[side] = result.resizable &&
            windowConstraints
                .map(constraint => constraint.resizeRegion === undefined || constraint.resizeRegion.sides[side] || constraint.resizeRegion === undefined)
                .every(val => val);
    });

    // Check if the union of side constraints made the window non-resizable
    if (result.resizable) {
        result.resizable = (Object.keys(result.resizeRegion.sides) as Side[]).some(key => result.resizeRegion.sides[key] !== false);
    }

    return result;
}