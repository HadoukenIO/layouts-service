import {test} from 'ava';
import {Application, Fin, Window} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import * as robot from 'robotjs';

import {CHANNEL_NAME} from '../../../src/client/types';
import {model} from '../../../src/provider/main';
import {assertAdjacent, assertAllHaveTabstrip, assertAllTabbed, assertGrouped, assertTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import {getWindow} from '../../provider/utils/getWindow';
import {saveRestoreCreateChildWindow} from '../../provider/utils/saveRestoreCreateChildWindow';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {sendServiceMessage} from '../utils/serviceUtils';
import {createApp, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

let fin: Fin;

let appIdCount = 0;
const getAppName = () => 'test-app-' + appIdCount++;

test.before(async (t) => {
    fin = await getConnection();
});

test.beforeEach(async (t) => {
    let y: () => void;
    let n: (e: string) => void;
    t.context.p = new Promise((res, rej) => {
        y = res;
        n = rej;
        t.context.y = y;
        t.context.n = n;
    });

    t.context.app1Name = getAppName();
    t.context.app2Name = getAppName();
    t.context.apps = [];
});

test.afterEach.always(async (t) => {
    const apps: Application[] = t.context.apps;
    await Promise.all(apps.map(app => app.close()));

    await fin.System.removeAllListeners();
});

test('Programmatic Save and Restore - 1 App', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');

    const passIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            t.context.y();
        }
    };
    await createCloseAndRestoreLayout(t, passIfAppCreated, true);
    t.pass();
});

test('Programmatic Save and Restore - 1 App 1 Child', async t => {
    const passIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
        if (event.name === 'Child-1 - win0') {
            t.context.y();
        }
    };

    const app1 = await createApp(t, t.context.app1Name, 'registered');
    await saveRestoreCreateChildWindow(t.context.app1Name);
    await createCloseAndRestoreLayout(t, passIfWindowCreated, true);
    t.pass();
});

test('Programmatic Save and Restore - 2 Snapped Apps', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'registered', 300, 400);

    let numAppsRestored = 0;
    const passIfAppsCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid || event.uuid === app2.identity.uuid) {
            numAppsRestored++;
        }
        if (numAppsRestored === 2) {
            t.context.y();
        }
    };

    let win1 = await app1.getWindow();
    let win2 = await app2.getWindow();

    await dragSideToSide(win1, 'right', win2, 'left');

    await createCloseAndRestoreLayout(t, passIfAppsCreated, true);

    win1 = await getWindow({uuid: app1.identity.uuid, name: app1.identity.uuid});
    win2 = await getWindow({uuid: app2.identity.uuid, name: app2.identity.uuid});

    await dragWindowTo(win1, 500, 500);

    await assertAdjacent(t, win1, win2);
    await assertGrouped(t, win1, win2);
});

test('Programmatic Save and Restore - 2 Tabbed Apps', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'registered', 300, 400);

    let numAppsRestored = 0;
    const passIfAppsCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid || event.uuid === app2.identity.uuid) {
            numAppsRestored++;
        }
        if (numAppsRestored === 2) {
            t.context.y();
        }
    };

    let win1 = await app1.getWindow();
    let win2 = await app2.getWindow();

    await tabWindowsTogether(win1, win2);

    await createCloseAndRestoreLayout(t, passIfAppsCreated, true);

    win1 = await getWindow({uuid: app1.identity.uuid, name: app1.identity.uuid});
    win2 = await getWindow({uuid: app2.identity.uuid, name: app2.identity.uuid});

    await assertAllTabbed(t, win1, win2);
    await assertGrouped(t, win1, win2);
    await assertAllHaveTabstrip(t, win1, win2);
});


test('Programmatic Save and Restore - Deregistered - 1 App', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'deregistered');

    const failIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            t.context.y();
            t.fail();
        }
    };

    await createCloseAndRestoreLayout(t, failIfAppCreated, false);
});

// test('Programmatic Save and Restore - Deregistered - 1 App 1 Child', async t => {
//     let y: () => void;
//     let n: (e: string) => void;
//     const p = new Promise((res, rej) => {
//         y = res;
//         n = rej;
//     });

//     const app1Name = getAppName();

//     app1 = await fin.Application.create({
//         uuid: app1Name,
//         url: 'http://localhost:1337/test/deregisteredApp.html',
//         name: app1Name,
//         mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 300, defaultWidth: 300}
//     });

//     const failIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
//         if (event.name === 'Child-1 - win0' || event.name === app1Name) {
//             y();
//             t.fail();
//         }
//     };

//     await app1.run();

//     await saveRestoreCreateChildWindow(app1Name);

//     await delay(1000);

//     const generatedLayout = await client.dispatch('generateLayout');

//     await fin.System.addListener('window-created', failIfWindowCreated);

//     await app1.close();

//     await client.dispatch('restoreLayout', generatedLayout);

//     setTimeout(() => {
//         y();
//         t.pass();
//     }, 2500);

//     await p;
// });

// test('Programmatic Save and Restore - Deregistered - 2 Snapped Apps', async t => {
//     let y: () => void;
//     let n: (e: string) => void;
//     const p = new Promise((res, rej) => {
//         y = res;
//         n = rej;
//     });

//     const app1Name = getAppName();
//     const app2Name = getAppName();
//     app1 = await fin.Application.create({
//         url: 'http://localhost:1337/test/registeredApp.html',
//         uuid: app1Name,
//         name: app1Name,
//         mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 300, defaultWidth: 300}
//     });
//     app2 = await fin.Application.create({
//         url: 'http://localhost:1337/test/deregisteredApp.html',
//         uuid: app2Name,
//         name: app2Name,
//         mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 300, defaultWidth: 300}
//     });

//     const failIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
//         if (event.name === `Child-1 - win0` || event.name === app2Name) {
//             y();
//             t.fail();
//         }
//     };

//     await app1.run();
//     await app2.run();

//     await saveRestoreCreateChildWindow(app2Name);

//     await delay(1000);

//     win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
//     win2 = await fin.Window.wrap({uuid: app2Name, name: `Child-1 - win0`});

//     const win2Bounds = await getBounds(win2);

//     await dragWindowTo(win1, win2Bounds.right + 2, win2Bounds.top + 40);
//     await dragWindowTo(win2, 700, 300);

//     const generatedLayout = await client.dispatch('generateLayout');

//     await app1.close();
//     await app2.close();

//     await fin.System.addListener('window-created', failIfWindowCreated);

//     await client.dispatch('restoreLayout', generatedLayout);

//     setTimeout(() => {
//         y();
//         t.pass();
//     }, 2500);

//     await p;
// });

// test('Programmatic Save and Restore - Deregistered - 2 Tabbed Apps', async t => {
//     let y: () => void;
//     let n: (e: string) => void;
//     const p = new Promise((res, rej) => {
//         y = res;
//         n = rej;
//     });

//     const app1Name = getAppName();
//     const app2Name = getAppName();
//     app1 = await fin.Application.create({
//         url: 'http://localhost:1337/test/registeredApp.html',
//         uuid: app1Name,
//         name: app1Name,
//         mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 300, defaultWidth: 300}
//     });
//     app2 = await fin.Application.create({
//         url: 'http://localhost:1337/test/deregisteredApp.html',
//         uuid: app2Name,
//         name: app2Name,
//         mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 300, defaultWidth: 300}
//     });

//     const failIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
//         if (event.name === `Child-1 - win0` || event.name === app2Name) {
//             y();
//             t.fail();
//         }
//     };

//     await app1.run();
//     await app2.run();

//     await saveRestoreCreateChildWindow(app2Name);

//     await delay(1000);

//     win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
//     win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: `Child-1 - win0`});

//     const win2Bounds = await getBounds(win2);

//     await dragWindowTo(win1, win2Bounds.left, win2Bounds.top);

//     await delay(500);

//     const generatedLayout = await client.dispatch('generateLayout');

//     await app1.close();
//     await app2.close();

//     await fin.System.addListener('window-created', failIfWindowCreated);

//     await client.dispatch('restoreLayout', generatedLayout);

//     setTimeout(async () => {
//         const options = await win1.getOptions();
//         y();
//         options.frame ? t.pass() : t.fail();
//     }, 2500);

//     await p;
// });