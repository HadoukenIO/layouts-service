import {Context, GenericTestContext, test} from 'ava';
import {Application, Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {createApp} from '../../src/demo/spawn';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {createCloseAndRestoreLayout} from '../demo/utils/workspacesUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertNotGrouped} from './utils/assertions';
import {getConnection} from './utils/connect';
import {dragSideToSide} from './utils/dragWindowTo';

type TestContext = GenericTestContext<Context<{windows: _Window[]}>>;

let appId = 0;

test.before(async () => {
    (global as NodeJS.Global & {fin: Fin}).fin = await getConnection();
});

test.beforeEach(async (t: TestContext) => {
    t.context.windows = [];
});
test.afterEach.always(async (t: TestContext) => {
    await Promise.all(t.context.windows.map(win => win.close()));

    await teardown(t);
});

interface TestApps {
    parent: Application;
    childApps: Application[];
    childWindows: _Window[];
}

async function createAppWithChildren(childType: 'manifest'|'programmatic'): Promise<TestApps> {
    const appIds: number[] = [++appId, ++appId, ++appId];
    const parent = await createApp({
        id: `App${appIds[0]}`,
        provider: 'http://localhost:1337/test/provider.json',
        config: {rules: [{scope: {level: 'application', uuid: {expression: `App(${appIds[1]}|${appIds[2]})`}}, config: {features: {dock: false}}}]}
    });
    const childApps = [
        // Spawn two new programmatic apps, and grab their main windows
        await createApp({id: `App${appIds[1]}`, type: 'programmatic', parent: parent.identity}),
        await createApp({id: `App${appIds[2]}`, type: 'programmatic', parent: parent.identity})
    ];

    return {parent, childApps, childWindows: await Promise.all(childApps.map(app => app.getWindow()))};
}

test('An application that declares the service is registered', async (t: TestContext) => {
    const app = await createApp({id: 'AppA', provider: 'http://localhost:1337/test/provider.json'});

    t.true(await isWindowRegistered(app.identity));

    await app.close();
});

test('An application that doesn\'t declare the service is degistered', async (t: TestContext) => {
    const app = await createApp({id: 'AppB', useService: false});

    t.false(await isWindowRegistered(app.identity));

    await app.close();
});

test('Programmatically creating a child app extends config lifespan', async (t: TestContext) => {
    const {parent, childApps, childWindows} = await createAppWithChildren('programmatic');

    // Check docking is disabled
    await dragSideToSide(childWindows[0], 'left', childWindows[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0], t);
    await assertNotGrouped(childWindows[1], t);

    // Close parent app
    await parent.close();

    // Ensure docking is still disabled
    await dragSideToSide(childWindows[1], 'left', childWindows[0], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0], t);
    await assertNotGrouped(childWindows[1], t);

    await Promise.all(childApps.map(app => app.close()));
});

test('Creating a child app from manifest has no effect on parent config lifespan', async (t: TestContext) => {
    const {parent, childApps, childWindows} = await createAppWithChildren('programmatic');

    // Check docking is disabled
    await dragSideToSide(childWindows[0], 'left', childWindows[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0], t);
    await assertNotGrouped(childWindows[1], t);

    // Close parent app
    await parent.close();

    // Ensure docking is now enabled
    await dragSideToSide(childWindows[1], 'left', childWindows[0], 'right', {x: 10, y: 50});
    await assertGrouped(t, childWindows[0], childWindows[1]);

    await Promise.all(childApps.map(app => app.close()));
});

test('Loader will override parentUuids with data in workspace when building app hierarchy', async (t: TestContext) => {
    const {parent, childApps, childWindows} = await createAppWithChildren('programmatic');

    await createCloseAndRestoreLayout(t);

    // Check docking is disabled
    await dragSideToSide(childWindows[0], 'left', childWindows[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0], t);
    await assertNotGrouped(childWindows[1], t);

    // Close parent app
    await parent.close();

    // Ensure docking is still disabled
    await dragSideToSide(childWindows[1], 'left', childWindows[0], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0], t);
    await assertNotGrouped(childWindows[1], t);

    await Promise.all(childApps.map(app => app.close()));
});

test('When saving a previously-restored workspace, the generated workspace will import parentUuids from Loader', async (t: TestContext) => {
    const {parent, childApps} = await createAppWithChildren('programmatic');

    const workspace1 = await createCloseAndRestoreLayout(t);
    t.is(workspace1.apps.length, 3);
    t.is(workspace1.apps[0].parentUuid, undefined);
    t.is(workspace1.apps[1].parentUuid, parent.identity.uuid);
    t.is(workspace1.apps[2].parentUuid, parent.identity.uuid);

    // Don't actually need restore here, but re-using existing utils.
    const workspace2 = await createCloseAndRestoreLayout(t);
    t.is(workspace2.apps.length, 3);
    t.is(workspace2.apps[0].parentUuid, undefined);
    t.is(workspace2.apps[1].parentUuid, parent.identity.uuid);
    t.is(workspace2.apps[2].parentUuid, parent.identity.uuid);

    // These will now be new app instances, but can still use these handles to close currently running apps
    await Promise.all(childApps.concat(parent).map(app => app.close()));
});
