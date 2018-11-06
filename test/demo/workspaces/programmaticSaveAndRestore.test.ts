import {test} from 'ava';
import {Application, Fin, Window} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import * as robot from 'robotjs';

import {CHANNEL_NAME} from '../../../src/client/types';
import {model} from '../../../src/provider/main';
import {assertAdjacent, assertAllHaveTabstrip, assertAllTabbed, assertGrouped, assertNotGrouped, assertTabbed} from '../../provider/utils/assertions';
import {getConnection} from '../../provider/utils/connect';
import {delay} from '../../provider/utils/delay';
import {dragTabOut} from '../../provider/utils/dragTabOut';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import {getWindow} from '../../provider/utils/getWindow';
import {saveRestoreCreateChildWindow} from '../../provider/utils/saveRestoreCreateChildWindow';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {sendServiceMessage} from '../utils/serviceUtils';
import {undockWindow} from '../utils/snapServiceUtils';
import {removeTab} from '../utils/tabServiceUtils';
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
    t.context.app3Name = getAppName();
    t.context.app4Name = getAppName();
    t.context.apps = [];
});

test.afterEach.always(async (t) => {
    const apps: Application[] = t.context.apps;
    await Promise.all(apps.map(async app => await app.close(true)));

    await delay(200);

    await fin.System.removeAllListeners();
});

test('Programmatic Save and Restore - Restore 1 App', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');

    const passIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            t.context.y();
        }
    };
    await createCloseAndRestoreLayout(t, passIfAppCreated, true);
    t.pass();
});

test('Programmatic Save and Restore - Restore 1 App and its 1 Child', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');

    const passIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
        if (event.name === 'Child-1 - win0') {
            t.context.y();
        }
    };

    await saveRestoreCreateChildWindow(t.context.app1Name);
    await createCloseAndRestoreLayout(t, passIfWindowCreated, true);
    t.pass();
});

test('Programmatic Save and Restore - Restore 2 Snapped Apps', async t => {
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

test('Programmatic Save and Restore - Restore 2 Tabbed Apps', async t => {
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


test('Programmatic Save and Restore - Deregistered - Doesn\'t Restore 1 App', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'deregistered');

    const failIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            t.context.y();
            t.fail();
        }
    };

    await createCloseAndRestoreLayout(t, failIfAppCreated, false);
});

test('Programmatic Save and Restore - Deregistered - Doesn\'t Restore 1 App or its 1 Child', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'deregistered');

    const failIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
        if (event.name === 'Child-1 - win0' || event.name === t.context.app1Name) {
            t.context.y();
            t.fail();
        }
    };

    await saveRestoreCreateChildWindow(t.context.app1Name);
    await createCloseAndRestoreLayout(t, failIfWindowCreated, false);
});

test('Programmatic Save and Restore - Deregistered - 2 Snapped Windows - Restores 1 Normal, but Not 1 Deregistered Child', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'deregistered', 300, 400);

    const failIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
        if (event.name === `Child-1 - win0` || event.name === t.context.app2Name) {
            t.context.y();
            t.fail();
        }
    };

    await saveRestoreCreateChildWindow(t.context.app2Name);

    let win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    const win2 = await fin.Window.wrap({uuid: t.context.app2Name, name: `Child-1 - win0`});

    await dragSideToSide(win1, 'right', win2, 'left');

    await createCloseAndRestoreLayout(t, failIfWindowCreated, false);
    win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    await assertNotGrouped(win1, t);
});

test('Programmatic Save and Restore - Deregistered - 2 Tabbed Windows - Restores 1 Normal, but Not 1 Deregistered Child', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'deregistered', 300, 400);

    const failIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
        if (event.name === `Child-1 - win0` || event.name === t.context.app2Name) {
            t.context.y();
            t.fail();
        }
    };

    await saveRestoreCreateChildWindow(t.context.app2Name);

    let win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    const win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: `Child-1 - win0`});

    await tabWindowsTogether(win1, win2);

    await createCloseAndRestoreLayout(t, failIfWindowCreated, false);
    win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    await assertNotGrouped(win1, t);
});

test('Programmatic Save and Restore - Switching From 1 Snap Group To Another', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'registered', 300, 400);

    await saveRestoreCreateChildWindow(t.context.app2Name);

    const win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    const win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: app2.identity.uuid});
    const win3 = await fin.Window.wrap({uuid: t.context.app2Name, name: `Child-1 - win0`});

    await dragSideToSide(win1, 'right', win3, 'left');

    const generatedLayout = await sendServiceMessage('generateLayout', undefined);

    await undockWindow(win1.identity);

    await dragSideToSide(win1, 'right', win2, 'left');

    await sendServiceMessage('restoreLayout', generatedLayout);
    await delay(500);

    await dragWindowTo(win1, 500, 500);

    await assertNotGrouped(win2, t);
    await assertAdjacent(t, win1, win3);
    await assertGrouped(t, win1, win3);
});

test('Programmatic Save and Restore - Switching From 1 Tab Group To Another', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'registered', 300, 400);

    await saveRestoreCreateChildWindow(t.context.app2Name);

    const win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    const win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: app2.identity.uuid});
    const win3 = await fin.Window.wrap({uuid: t.context.app2Name, name: `Child-1 - win0`});


    await tabWindowsTogether(win1, win3);

    const generatedLayout = await sendServiceMessage('generateLayout', undefined);

    await removeTab(win1.identity);
    await delay(500);

    await dragWindowTo(win3, 500, 500);

    await tabWindowsTogether(win1, win2);

    await sendServiceMessage('restoreLayout', generatedLayout);
    await delay(500);

    await assertNotGrouped(win2, t);
    await assertAllTabbed(t, win1, win3);
    await assertGrouped(t, win1, win3);
    await assertAllHaveTabstrip(t, win1, win3);
});

test('Programmatic Save and Restore - Switching Tab Groups and Snap Groups', async t => {
    const app1 = await createApp(t, t.context.app1Name, 'registered');
    const app2 = await createApp(t, t.context.app2Name, 'registered', 300, 400);

    await saveRestoreCreateChildWindow(t.context.app1Name);
    await saveRestoreCreateChildWindow(t.context.app2Name);

    const win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.uuid});
    const win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: app2.identity.uuid});
    const win3 = await fin.Window.wrap({uuid: app1.identity.uuid, name: `Child-1 - win0`});
    const win4 = await fin.Window.wrap({uuid: app2.identity.uuid, name: `Child-1 - win0`});

    await tabWindowsTogether(win1, win3);
    await dragSideToSide(win2, 'right', win4, 'left');
    await delay(1000);

    const generatedLayout = await sendServiceMessage('generateLayout', undefined);

    await dragTabOut(win1, 500, 100);
    await undockWindow(win2.identity);
    await delay(500);

    await dragWindowTo(win2, 500, 500);

    await dragSideToSide(win1, 'right', win4, 'left');
    await tabWindowsTogether(win3, win2);
    await delay(1000);

    await sendServiceMessage('restoreLayout', generatedLayout);
    await delay(500);

    await assertAllTabbed(t, win1, win3);
    await assertGrouped(t, win1, win3);
    await assertAllHaveTabstrip(t, win1, win3);
    await assertAdjacent(t, win2, win4);
    await assertGrouped(t, win2, win4);
});