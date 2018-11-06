import {test} from 'ava';
import {Application, Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {isWindowRegistered} from '../demo/utils/snapServiceUtils';

import {getConnection} from './utils/connect';
import {delay} from './utils/delay';

let fin: Fin;
let crashApp: Application|undefined = undefined;

test.before(async t => {
    fin = await getConnection();
});

test('Error windows are not registered with layouts', async t => {
    crashApp = await fin.Application.create(
        {uuid: 'crash-app-1', name: 'crash-app-1', url: 'http://localhost:1337/test/crash.html', mainWindowOptions: {autoShow: true}});

    // We fire-and-forget since it will crash and may block the test if awaited
    crashApp.run();

    let errorWindow: _Window|undefined = undefined;
    let count = 0;
    // Check every second for the error window and wrap it when it appears
    do {
        // If it takes more than 10 seconds to crash, we will throw an error and fail the test.
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
    }
});

test.afterEach.always(async t => {
    if (crashApp) {
        crashApp.close(true);
    }
});