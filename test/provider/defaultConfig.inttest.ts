import {Application} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {createApp} from 'openfin-service-tooling/spawn';
import * as assert from 'power-assert';

import {fin} from '../demo/utils/fin';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {createCloseAndRestoreLayout} from '../demo/utils/workspacesUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertNotGrouped} from './utils/assertions';
import {dragSideToSide} from './utils/dragWindowTo';

type TestContext = {
    windows: _Window[]
};

let appId = 0;

const DEFAULT_URL = 'http://localhost:1337/demo/testbed/index.html';

const context: TestContext = {
    windows: []
};

beforeAll(async () => {
    Object.assign(global, {fin});
});

beforeEach(async () => {
    context.windows = [];
});
afterEach(async () => {
    await Promise.all(context.windows.map(win => win.close()));

    await teardown();
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
        url: DEFAULT_URL,
        config: {rules: [{scope: {level: 'application', uuid: {expression: `App(${appIds[1]}|${appIds[2]})`}}, config: {features: {dock: false}}}]}
    });
    const childApps = [
        // Spawn two new programmatic apps, and grab their main windows
        await createApp({id: `App${appIds[1]}`, type: 'programmatic', parent: parent.identity, url: DEFAULT_URL}),
        await createApp({id: `App${appIds[2]}`, type: 'programmatic', parent: parent.identity, url: DEFAULT_URL})
    ];

    return {parent, childApps, childWindows: await Promise.all(childApps.map(app => app.getWindow()))};
}

it('An application that declares the service is registered', async () => {
    const app = await createApp({id: 'AppA', provider: 'http://localhost:1337/test/provider.json'});

    assert.strictEqual(await isWindowRegistered(app.identity), true);

    await app.close();
});

it('An application that doesn\'t declare the service is de-registered', async () => {
    const app = await createApp({id: 'AppB', useService: false});

    assert.strictEqual(await isWindowRegistered(app.identity), false);

    await app.close();
});

it('Programmatically creating a child app extends config lifespan', async () => {
    const {parent, childApps, childWindows} = await createAppWithChildren('programmatic');
    // Check docking is disabled
    await dragSideToSide(childWindows[0], 'left', childWindows[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0]);
    await assertNotGrouped(childWindows[1]);

    // Close parent app
    await parent.close();

    // Ensure docking is still disabled
    await dragSideToSide(childWindows[1], 'left', childWindows[0], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0]);
    await assertNotGrouped(childWindows[1]);

    await Promise.all(childApps.map(app => app.close()));
});

it('Creating a child app from manifest has no effect on parent config lifespan', async () => {
    const {parent, childApps, childWindows} = await createAppWithChildren('programmatic');

    // Check docking is disabled
    await dragSideToSide(childWindows[0], 'left', childWindows[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0]);
    await assertNotGrouped(childWindows[1]);

    // Close parent app
    await parent.close();

    // Ensure docking is now enabled
    await dragSideToSide(childWindows[1], 'left', childWindows[0], 'right', {x: 10, y: 50});
    await assertGrouped(childWindows[0], childWindows[1]);

    await Promise.all(childApps.map(app => app.close()));
});

it('Loader will override parentUuids with data in workspace when building app hierarchy', async () => {
    const {parent, childApps, childWindows} = await createAppWithChildren('programmatic');

    await createCloseAndRestoreLayout();

    // Check docking is disabled
    await dragSideToSide(childWindows[0], 'left', childWindows[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0]);
    await assertNotGrouped(childWindows[1]);

    // Close parent app
    await parent.close();

    // Ensure docking is still disabled
    await dragSideToSide(childWindows[1], 'left', childWindows[0], 'right', {x: 10, y: 50});
    await assertNotGrouped(childWindows[0]);
    await assertNotGrouped(childWindows[1]);

    await Promise.all(childApps.map(app => app.close()));
});

it('When saving a previously-restored workspace, the generated workspace will import parentUuids from Loader', async () => {
    const {parent, childApps} = await createAppWithChildren('programmatic');

    const workspace1 = await createCloseAndRestoreLayout();
    assert.strictEqual(workspace1.apps.length, 3);
    assert.strictEqual(workspace1.apps[0].parentUuid, undefined);
    assert.strictEqual(workspace1.apps[1].parentUuid, parent.identity.uuid);
    assert.strictEqual(workspace1.apps[2].parentUuid, parent.identity.uuid);

    // Don't actually need restore here, but re-using existing utils.
    const workspace2 = await createCloseAndRestoreLayout();
    assert.strictEqual(workspace2.apps.length, 3);
    assert.strictEqual(workspace2.apps[0].parentUuid, undefined);
    assert.strictEqual(workspace2.apps[1].parentUuid, parent.identity.uuid);
    assert.strictEqual(workspace2.apps[2].parentUuid, parent.identity.uuid);

    // These will now be new app instances, but can still use these handles to close currently running apps
    await Promise.all(childApps.concat(parent).map(app => app.close()));
});
