import {test} from 'ava';

import {Workspace} from '../../../src/client/types';
import {assertAllContiguous, assertGrouped, assertNotGrouped} from '../../provider/utils/assertions';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import {delay} from '../../provider/utils/delay';
import {WindowInitializer} from '../../provider/utils/WindowInitializer';
import {teardown} from '../../teardown';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';
import {assertWindowNotRestored, assertWindowRestored} from '../utils/workspacesUtils';

interface ValidateOnRestoreOptions {
    windowCount: number;
    arrangement: string;
    remainingGroups: number[][];
    deregisteredIndex: number;  // Zero indexed. See defaultArrangements for mappings of index to relative position.
}

const childOptions = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 250,
    defaultWidth: 250,
    url: 'http://localhost:1337/test/demo-window.html',
    frame: false
};

test.afterEach.always(teardown);

testParameterized(
    'Validate Group on Restore',
    [
        {windowCount: 3, arrangement: 'line', deregisteredIndex: 1, remainingGroups: [[0], [2]]},
        {windowCount: 3, arrangement: 'line', deregisteredIndex: 2, remainingGroups: [[0, 1]]},
        {windowCount: 3, arrangement: 'vertical-triangle', deregisteredIndex: 1, remainingGroups: [[0, 2]]},
        {windowCount: 3, arrangement: 'vertical-triangle', deregisteredIndex: 2, remainingGroups: [[0, 1]]},
        {windowCount: 5, arrangement: 'hourglass', deregisteredIndex: 2, remainingGroups: [[0, 1], [3, 4]]},
    ],
    async (t, testOptions: ValidateOnRestoreOptions) => {
        const layoutsClient = await layoutsClientPromise;
        const {windowCount, arrangement, remainingGroups, deregisteredIndex} = testOptions;


        const deregisteredApp = await fin.Application.create({
            uuid: 'deregistered-test-app',
            url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true',
            name: 'deregistered-test-app',
            mainWindowOptions: {autoShow: false}
        });
        await deregisteredApp.run();
        const registeredApp = await fin.Application.create({
            uuid: 'registered-test-app',
            url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false',
            name: 'registered-test-app',
            mainWindowOptions: {autoShow: false}
        });
        await registeredApp.run();

        const deregisteredChild = await createChildWindow({...childOptions, defaultTop: 500, defaultLeft: 200}, 'deregistered-test-app');
        const registeredChildren = [];
        for (let i = 0; i < windowCount - 1; i++) {
            registeredChildren.push(await createChildWindow({...childOptions, defaultTop: 200, defaultLeft: 200 + (i * 300)}, 'registered-test-app'));
        }

        // Insert the deregisterd window where needed. We use a copy of
        // registeredWindows as the original is needed later
        const windows = [...registeredChildren];
        windows.splice(deregisteredIndex, 0, deregisteredChild);

        const initializer = new WindowInitializer();
        await initializer.arrangeWindows(windows, arrangement);
        await assertGrouped(t, ...windows);

        const layout: Workspace = await layoutsClient.workspaces.generate();

        await Promise.all(windows.map(w => fin.Window.wrapSync(w.identity).close()));
        deregisteredApp.close(true);
        await delay(500);

        await layoutsClient.workspaces.restore(layout);
        await delay(1500);

        await Promise.all(registeredChildren.map(w => assertWindowRestored(t, w.identity.uuid, w.identity.name!)));

        await assertWindowNotRestored(t, deregisteredChild.identity.uuid, deregisteredChild.identity.name!);

        for (const group of remainingGroups) {
            if (group.length === 1) {
                await assertNotGrouped(windows[group[0]], t);
            } else {
                const groupedWindows = group.map(id => windows[id]);
                await assertGrouped(t, ...groupedWindows);
                await assertAllContiguous(t, groupedWindows);
            }
        }

        await registeredApp.close(true).catch();
        await delay(300);
    });
