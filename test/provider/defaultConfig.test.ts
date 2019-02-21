import {Context, GenericTestContext, test} from 'ava';
import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {createApp} from '../../src/demo/spawn';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertNotGrouped} from './utils/assertions';
import {getConnection} from './utils/connect';
import {dragSideToSide} from './utils/dragWindowTo';

type TestContext = GenericTestContext<Context<{windows: _Window[]}>>;

const DEFAULT_OPTIONS: fin.WindowOptions = {
    url: 'http://localhost:1337/demo/testbed/index.html',
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultWidth: 300,
    defaultHeight: 200
};

test.before(async () => {
    (global as NodeJS.Global & {fin: Fin}).fin = await getConnection();
    // global["fin"] = await getConnection();
});

test.beforeEach(async (t: TestContext) => {
    t.context.windows = [];
});
test.afterEach.always(async (t: TestContext) => {
    await Promise.all(t.context.windows.map(win => win.close()));

    await teardown(t);
});

// async function isWindowRegistered(identity: Identity): Promise<boolean> {
//     return executeJavascriptOnService(function(this: ProviderWindow, identity: Identity) {
//         const windowIdentity: WindowIdentity = {uuid: identity.uuid, name: identity.name || identity.uuid}
//         const window = this.model.getWindow(windowIdentity);
//         return window !== null;
//     }, identity);
// }

test('An application that declares the service is registered', async (t: TestContext) => {
    const app = await createApp({id: 'App1', provider: 'http://localhost:1337/test/provider.json'});

    t.true(await isWindowRegistered(app.identity));

    await app.close();
});

test('An application that doesn\'t declare the service is degistered', async (t: TestContext) => {
    const app = await createApp({id: 'App2', useService: false});

    t.false(await isWindowRegistered(app.identity));

    await app.close();
});

test('Programmatically creating a child app extends config lifespan', async (t: TestContext) => {
    const app = await createApp({
        id: 'App3',
        provider: 'http://localhost:1337/test/provider.json',
        config: {rules: [{scope: {level: 'application', uuid: {expression: 'App[45]'}}, config: {features: {dock: false}}}]}
    });
    const children = [
        // Spawn two new programmatic apps, and grab their main windows
        await createApp({id: 'App4', type: 'programmatic', parent: app.identity}).then(app => app.getWindow()),
        await createApp({id: 'App5', type: 'programmatic', parent: app.identity}).then(app => app.getWindow())
    ];

    // Check docking is disabled
    await dragSideToSide(children[0], 'left', children[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(children[0], t);
    await assertNotGrouped(children[1], t);

    // Close parent app
    await app.close();

    // Ensure docking is still disabled
    await dragSideToSide(children[1], 'left', children[0], 'right', {x: 10, y: 50});
    await assertNotGrouped(children[0], t);
    await assertNotGrouped(children[1], t);

    await Promise.all(children.map(win => win.close()));
});

test('Creating a child app from manifest has no effect on parent config lifespan', async (t: TestContext) => {
    const app = await createApp({
        id: 'App6',
        provider: 'http://localhost:1337/test/provider.json',
        config: {rules: [{scope: {level: 'application', uuid: {expression: 'App[78]'}}, config: {features: {dock: false}}}]}
    });
    const children = [
        // Spawn two new programmatic apps, and grab their main windows
        await createApp({id: 'App7', provider: 'http://localhost:1337/test/provider.json', parent: app.identity}).then(app => app.getWindow()),
        await createApp({id: 'App8', provider: 'http://localhost:1337/test/provider.json', parent: app.identity}).then(app => app.getWindow())
    ];

    // Check docking is disabled
    await dragSideToSide(children[0], 'left', children[1], 'right', {x: 10, y: 50});
    await assertNotGrouped(children[0], t);
    await assertNotGrouped(children[1], t);

    // Close parent app
    await app.close();

    // Ensure docking is now enabled
    await dragSideToSide(children[1], 'left', children[0], 'right', {x: 10, y: 50});
    await assertGrouped(t, children[0], children[1]);

    await Promise.all(children.map(win => win.close()));
});
