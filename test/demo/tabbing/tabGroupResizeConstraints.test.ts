import {test} from 'ava';
import {Fin} from 'hadouken-js-adapter';

import {assertAllTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {Constraints} from '../snapanddock/resizeOnSnap.test';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {refreshWindowState} from '../utils/modelUtils';
import {testParameterized} from '../utils/parameterizedTestUtils';
import { delay } from '../../provider/utils/delay';

interface TabConstraintsOptions extends CreateWindowData {
    constraints: Constraints;
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
        {frame: true, windowCount: 2, constraints: {resizable: false}},
    ],
    createWindowTest(async (t, options: TabConstraintsOptions) => {
        const windows = t.context.windows;

        await windows[1].updateOptions({...options.constraints});
        await refreshWindowState(windows[1].identity);

        await layoutsClient.createTabGroup(windows.map(win => win.identity));

        await delay(200);

        await assertAllTabbed(t, ...windows);

        const windowOptions = await Promise.all(windows.map(win => win.getOptions()));

        for (const key of Object.keys(options.constraints) as (keyof typeof options.constraints)[]) {
            if (options.constraints.hasOwnProperty(key)) {
                t.is(windowOptions[0][key], options.constraints[key]);
                t.is(windowOptions[1][key], options.constraints[key]);
            }
        }
    }));
