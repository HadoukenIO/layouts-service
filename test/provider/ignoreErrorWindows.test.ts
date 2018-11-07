import {test} from 'ava';
import {Application, Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {Layout} from '../../src/client/types';
import {sendServiceMessage} from '../demo/utils/serviceUtils';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';

import {getConnection} from './utils/connect';
import {delay} from './utils/delay';

let fin: Fin;
let crashApp: Application|undefined = undefined;

test.before(async t => {
    fin = await getConnection();
});

test('Error windows are not registered with S&D or Tabbing', async t => {
    crashApp = await fin.Application.create(
        {uuid: 'crash-app-1', name: 'crash-app-1', url: 'http://localhost:1337/test/crash.html', mainWindowOptions: {autoShow: true}});

    // We fire-and-forget since it will crash and may block the test if awaited
    crashApp.run();

    let errorWindow: _Window|undefined = undefined;
    let count = 0;
    // Check every second for the error window and wrap it when it appears
    do {
        // If it takes more than 10 seconds to crash, we will fail the test and break out of the loop.
        if (count++ > 10) {
            t.fail('Error window not found after 10 seconds. App may not have crashed or error window signature may have changed');
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
        t.false(await isWindowRegistered(errorWindow.identity), `Error window with identity "${errorWindow.identity.uuid}" was registered with the service.`);
        await errorWindow.close();
    }
});

test('Error windows are not included in generateLayout', async t => {
    crashApp = await fin.Application.create(
        {uuid: 'crash-app-1', name: 'crash-app-1', url: 'http://localhost:1337/test/crash.html', mainWindowOptions: {autoShow: true}});

    // We fire-and-forget since it will crash and may block the test if awaited
    crashApp.run();

    let errorWindow: _Window|undefined = undefined;
    let count = 0;
    // Check every second for the error window and wrap it when it appears
    do {
        // If it takes more than 10 seconds to crash, we will fail the test and break out of the loop.
        if (count++ > 10) {
            t.fail('Error window not found after 10 seconds. App may not have crashed or error window signature may have changed');
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
        await delay(1000);
        const layout = await sendServiceMessage<undefined, Layout>('generateLayout', undefined);
        console.log(layout);

        t.false(isErrorInLayout(errorWindow.identity.uuid, layout), 'Error window found in generated layout');

        await errorWindow.close();
    }
});

test.afterEach.always(async t => {
    if (crashApp && await crashApp.isRunning()) {
        crashApp.close(true);
    }
});

function isErrorInLayout(errorUuid: string, layout: Layout) {
    return layout.apps.some(app => app.uuid === errorUuid);
}