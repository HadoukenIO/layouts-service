import {Application, Fin, Identity} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {ConfigurationObject, Scope} from '../../gen/provider/config/layouts-config';
import {ConfigWithRules} from '../../src/provider/config/Store';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {assertNotGrouped} from './utils/assertions';
import {getConnection} from './utils/connect';
import {createChildApp, createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragSideToSide} from './utils/dragWindowTo';

let fin: Fin;
let app: Application;

// Each test must have a unique app UUID, as otherwise calls to getManifest within the provider can return the manifest of a previous test run.
let counter = 0;
function createUuid(): string {
    return `test-app-config-${++counter}`;
}

async function getWindowConfig(identity: Identity): Promise<ConfigurationObject> {
    return await executeJavascriptOnService(function(this: ProviderWindow, identity: Identity): ConfigurationObject {
        const scope: Scope = {level: 'window', uuid: identity.uuid, name: identity.name || identity.uuid};
        return this.config.query(scope);
    }, identity);
}

beforeAll(async () => {
    fin = await getConnection();
});
afterEach(teardown);

async function createAppWithConfig(uuid: string, config: ConfigWithRules<ConfigurationObject>, parentUuid?: string): Promise<Application> {
    const url = `http://localhost:1337/create-manifest?uuid=${uuid}&config=${encodeURIComponent(JSON.stringify(config))}`;

    if (!parentUuid) {
        // Create a new application directly
        const app = await fin.Application.createFromManifest(url);
        await app.run();
        return app;
    } else {
        // Send a message to 'parentUuid', instructing it to open a child application
        return createChildApp(url, parentUuid);
    }
}

it('Config is loaded from an application\'s manifest', async () => {
    const uuid = createUuid();
    const identity = {uuid, name: uuid};

    app = await createAppWithConfig(uuid, {enabled: false});

    // Config specifies that window shouldn't be registered
    const config = await getWindowConfig(identity);
    assert.strictEqual(config.enabled, false);

    // Window isn't registered within model
    assert.strictEqual(await isWindowRegistered(identity), false);

    await app.close();

    await delay(1000);
});

it('Config is unloaded when the application exits', async () => {
    const uuid = createUuid();
    const identity = {uuid, name: uuid};

    app = await createAppWithConfig(uuid, {enabled: false});

    // Sanity check - make sure config was definitely loaded initially
    const preConfig = await getWindowConfig(identity);
    assert.strictEqual(preConfig.enabled, false);

    await app.close();

    // App-specific config has been removed, querying 'enabled' returns the default value of true
    const postConfig = await getWindowConfig(identity);
    assert.strictEqual(postConfig.enabled, true);
});

it('If an application creates a child application, the config of the parent application persists for the lifecycle of its child', async () => {
    const uuids: [string, string] = [createUuid(), createUuid()];
    const app = await createAppWithConfig(uuids[0], {enabled: false});
    const child = await createChildApp(
        {uuid: uuids[1], mainWindowOptions: {url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false', name: uuids[1]}},
        app.identity.uuid);

    // Config should disable main app, child app remains registered
    assert.strictEqual((await getWindowConfig(app.identity)).enabled, false);
    assert.strictEqual((await getWindowConfig(child.identity)).enabled, true);

    await app.close();

    // No change in config state, as child app extends the lifespan of main app's config
    assert.strictEqual((await getWindowConfig(app.identity)).enabled, false);
    assert.strictEqual((await getWindowConfig(child.identity)).enabled, true);

    await child.close();

    // Config should now revert to initial state (everything enabled)
    assert.strictEqual((await getWindowConfig(app.identity)).enabled, true);
    assert.strictEqual((await getWindowConfig(child.identity)).enabled, true);
});

it('If an application creates a child application, the parent can apply rules to the child that still apply after the parent exits', async () => {
    const uuids: [string, string] = [createUuid(), createUuid()];
    const app =
        await createAppWithConfig(uuids[0], {enabled: false, rules: [{scope: {level: 'application', uuid: uuids[1]}, config: {features: {snap: false}}}]});
    const childApp = await createChildApp(
        {uuid: uuids[1], mainWindowOptions: {url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false', name: uuids[1]}},
        app.identity.uuid);
    const childWindow = await createChildWindow({name: 'childApp-win1'}, uuids[1]);

    // Close parent app, small delay to ensure loader captures events
    await app.close();
    await delay(500);

    // Snapping should still be disabled on windows belonging to childApp
    await dragSideToSide(await childApp.getWindow(), 'left', childWindow, 'right', {x: 5, y: 20});
    await assertNotGrouped(childWindow);

    await childApp.close();
});

it('If an application creates a child application via manifest, there is no extension of parent config lifecycle', async () => {
    const app = await createAppWithConfig(createUuid(), {enabled: false});
    const child = await createAppWithConfig(createUuid(), {enabled: false}, app.identity.uuid);

    assert.strictEqual((await getWindowConfig(app.identity)).enabled, false);
    assert.strictEqual((await getWindowConfig(child.identity)).enabled, false);

    await app.close();

    assert.strictEqual((await getWindowConfig(app.identity)).enabled, true);
    assert.strictEqual((await getWindowConfig(child.identity)).enabled, false);

    await child.close();

    assert.strictEqual((await getWindowConfig(app.identity)).enabled, true);
    assert.strictEqual((await getWindowConfig(child.identity)).enabled, true);
});
