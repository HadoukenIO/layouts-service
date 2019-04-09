import {Application, Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as assert from 'power-assert';

import {WorkspaceAPI} from '../../src/client/internal';
import {Workspace} from '../../src/client/workspaces';
import {sendServiceMessage} from '../demo/utils/serviceUtils';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {delay} from './utils/delay';

let fin: Fin;
let crashApp: Application|undefined = undefined;

beforeAll(async () => {
    fin = await getConnection();
});
afterEach(async () => {
    if (crashApp) {
        crashApp.close(true);
    }

    await teardown();
});

it('Error windows are not registered with S&D or Tabbing', async () => {
    crashApp = await fin.Application.create({uuid: 'crash-app-1', name: 'crash-app-1', url: 'http://localhost:1337/test/crash.html', mainWindowOptions: {autoShow: true}});

    // We fire-and-forget since it will crash and may block the test if awaited
    crashApp.run();

    let errorWindow: _Window|undefined = undefined;
    let count = 0;
    // Check every second for the error window and wrap it when it appears
    do {
        // If it takes more than 10 seconds to crash, we will fail the test and break out of the loop.
        if (count++ > 10) {
            assert.fail('Error window not found after 10 seconds. App may not have crashed or error window signature may have changed');
            break;
        }
        const allApps = await fin.System.getAllApplications();
        const errorAppInfo = allApps.find(appInfo => appInfo.uuid.startsWith('error-app-'));
        if (errorAppInfo) {
            errorWindow = fin.Window.wrapSync({uuid: errorAppInfo.uuid, name: errorAppInfo.uuid});
        }
        await delay(1000);
    } while (errorWindow === undefined);

    if (errorWindow) {
        assert.strictEqual(
            await isWindowRegistered(errorWindow.identity),
            false,
            `Error window with identity "${errorWindow.identity.uuid}" was registered with the service.`
        );
        await errorWindow.close();
    }
});

it('Error windows are not included in generateLayout', async () => {
    crashApp = await fin.Application.create({uuid: 'crash-app-1', name: 'crash-app-1', url: 'http://localhost:1337/test/crash.html', mainWindowOptions: {autoShow: true}});

    // We fire-and-forget since it will crash and may block the test if awaited
    crashApp.run();

    let errorWindow: _Window|undefined = undefined;
    let count = 0;
    // Check every second for the error window and wrap it when it appears
    do {
        // If it takes more than 10 seconds to crash, we will fail the test and break out of the loop.
        if (count++ > 10) {
            assert.fail('Error window not found after 10 seconds. App may not have crashed or error window signature may have changed');
            break;
        }
        const allApps = await fin.System.getAllApplications();
        const errorAppInfo = allApps.find(appInfo => appInfo.uuid.startsWith('error-app-'));
        if (errorAppInfo) {
            errorWindow = fin.Window.wrapSync({uuid: errorAppInfo.uuid, name: errorAppInfo.uuid});
        }
        await delay(1000);
    } while (errorWindow === undefined);

    if (errorWindow) {
        const layout = await sendServiceMessage<undefined, Workspace>(WorkspaceAPI.GENERATE_LAYOUT, undefined);

        assert.strictEqual(isErrorInLayout(errorWindow.identity.uuid, layout), false, 'Error window found in generated layout');

        await errorWindow.close();
    }
});

function isErrorInLayout(errorUuid: string, layout: Workspace) {
    return layout.apps.some(app => app.uuid === errorUuid);
}
