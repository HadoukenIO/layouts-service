import {test} from 'ava';
import {Fin} from 'hadouken-js-adapter';

import {assertAllTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {delay} from '../../provider/utils/delay';
import {Constraints} from '../snapanddock/resizeOnSnap.test';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {refreshWindowState} from '../utils/modelUtils';
import {testParameterized} from '../utils/parameterizedTestUtils';

interface TabConstraintsOptions extends CreateWindowData {
    windowConstraints: Constraints[];
}

// Some questionable code that allows using the layouts client directly in tests
let layoutsClient: typeof import('../../../src/client/main');
test.before(async () => {
    layoutsClient = await getConnection().then(fin => {
        (global as NodeJS.Global & {fin: Fin}).fin = fin;
        (global as NodeJS.Global & {PACKAGE_VERSION: string}).PACKAGE_VERSION = 'TEST-CLIENT';
        return import('../../../src/client/main');
    });
});

testParameterized(
    'Constraints applied to all tabs in group',
    [
        {frame: true, windowCount: 2, windowConstraints: [{resizable: false}]},
        {frame: true, windowCount: 2, windowConstraints: [{maxHeight: 500, minWidth: 100}]},
        {
            frame: true,
            windowCount: 3,
            windowConstraints: [
                {resizeRegion: {sides: {top: false, left: false, bottom: true, right: true}}},
                {resizeRegion: {sides: {top: true, left: true, bottom: false, right: false}}}
            ]
        },
    ],
    createWindowTest(async (t, options: TabConstraintsOptions) => {
        const windows = t.context.windows;

        await Promise.all(windows.map((win, index) => win.updateOptions(options.windowConstraints[index])));
        await Promise.all(windows.map((win) => refreshWindowState(win.identity)));

        await refreshWindowState(windows[0].identity);

        await layoutsClient.createTabGroup(windows.map(win => win.identity));

        await delay(1000);

        await assertAllTabbed(t, ...windows);

        const resultingConstraints = constraintsUnion(...options.windowConstraints);

        for (let i = 0; i < windows.length; i++) {
            const windowOptions = await windows[i].getOptions().then(options => {
                if (options.maxHeight < 0) {
                    options.maxHeight = Number.MAX_SAFE_INTEGER;
                }
                if (options.maxWidth < 0) {
                    options.maxWidth = Number.MAX_SAFE_INTEGER;
                }
                return options;
            });

            for (const key of Object.keys(resultingConstraints) as (keyof typeof resultingConstraints)[]) {
                if (resultingConstraints.hasOwnProperty(key)) {
                    if (typeof resultingConstraints[key] === 'object') {
                        t.deepEqual(
                            windowOptions[key],
                            resultingConstraints[key],
                            `${key} does not match for window ${i} (name: ${windows[i].identity.name}). Expected: ${
                                JSON.stringify(resultingConstraints[key])}. Received: ${JSON.stringify(windowOptions[key])}`);
                    } else {
                        t.is(
                            windowOptions[key],
                            resultingConstraints[key],
                            `${key} does not match. Expected: ${resultingConstraints[key]}. Received ${windowOptions[key]}`);
                    }
                }
            }
        }
    }));

function constraintsUnion(...windowConstraints: Constraints[]): Constraints {
    const result: Constraints = {};

    for (const constraint of windowConstraints) {
        result.minWidth = Math.max(result.minWidth || 0, constraint.minWidth || 0);
        result.maxWidth = Math.min(
            result.maxWidth || Number.MAX_SAFE_INTEGER, (!constraint.maxWidth || constraint.maxWidth < 0) ? Number.MAX_SAFE_INTEGER : constraint.maxWidth);
        result.minHeight = Math.max(result.minHeight || 0, constraint.minHeight || 0);
        result.maxHeight = Math.min(
            result.maxHeight || Number.MAX_SAFE_INTEGER, (!constraint.maxHeight || constraint.maxHeight < 0) ? Number.MAX_SAFE_INTEGER : constraint.maxHeight);

        let resizableSide = !constraint.resizeRegion;
        if (constraint.resizeRegion) {
            if (!result.resizeRegion) {
                result.resizeRegion = {sides: {top: true, bottom: true, left: true, right: true}};
            }
            for (const key of Object.keys(constraint.resizeRegion.sides) as ('top' | 'bottom' | 'left' | 'right')[]) {
                result.resizeRegion.sides[key] = result.resizeRegion.sides[key] && constraint.resizeRegion.sides[key];
                resizableSide = resizableSide || result.resizeRegion.sides[key];
            }
        }


        result.resizable = !(result.resizable === false) && !(constraint.resizable === false) && resizableSide;
    }

    return result;
}