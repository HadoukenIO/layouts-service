import test from 'ava';
import {Application, Fin, Identity} from 'hadouken-js-adapter';

import {ConfigurationObject} from '../../gen/provider/config/layouts-config';
import {Scope} from '../../gen/provider/config/scope';
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

test.before(async () => {
    fin = await getConnection();
});
test.afterEach.always(teardown);

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

test('Config is loaded from an application\'s manifest', async (t) => {
    const uuid = createUuid();
    const identity = {uuid, name: uuid};

    app = await createAppWithConfig(uuid, {enabled: false});

    // Config specifies that window shouldn't be registered
    const config = await getWindowConfig(identity);
    t.false(config.enabled);

    // Window isn't registered within model
    t.false(await isWindowRegistered(identity));

    await app.close();

    await delay(1000);
});

test('Config is unloaded when the application exits', async (t) => {
    const uuid = createUuid();
    const identity = {uuid, name: uuid};

    app = await createAppWithConfig(uuid, {enabled: false});

    // Sanity check - make sure config was definitely loaded initially
    const preConfig = await getWindowConfig(identity);
    t.false(preConfig.enabled);

    await app.close();

    // App-specific config has been removed, querying 'enabled' returns the default value of true
    const postConfig = await getWindowConfig(identity);
    t.true(postConfig.enabled);
});

test('If an application creates a child application, the config of the parent application persists for the lifecycle of its child', async (t) => {
    const uuids: [string, string] = [createUuid(), createUuid()];
    const app = await createAppWithConfig(uuids[0], {enabled: false});
    const child = await createChildApp(
        {uuid: uuids[1], mainWindowOptions: {url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false', name: uuids[1]}},
        app.identity.uuid);

    // Config should disable main app, child app remains registered
    t.false((await getWindowConfig(app.identity)).enabled);
    t.true((await getWindowConfig(child.identity)).enabled);

    await app.close();

    // No change in config state, as child app extends the lifespan of main app's config
    t.false((await getWindowConfig(app.identity)).enabled);
    t.true((await getWindowConfig(child.identity)).enabled);

    await child.close();

    // Config should now revert to initial state (everything enabled)
    t.true((await getWindowConfig(app.identity)).enabled);
    t.true((await getWindowConfig(child.identity)).enabled);
});

test('If an application creates a child application, the parent can apply rules to the child that still apply after the parent exits', async (t) => {
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
    await assertNotGrouped(childWindow, t);

    await childApp.close();
});

test('If an application creates a child application via manifest, there is no extension of parent config lifecycle', async (t) => {
    const app = await createAppWithConfig(createUuid(), {enabled: false});
    const child = await createAppWithConfig(createUuid(), {enabled: false}, app.identity.uuid);

    t.false((await getWindowConfig(app.identity)).enabled);
    t.false((await getWindowConfig(child.identity)).enabled);

    await app.close();

    t.true((await getWindowConfig(app.identity)).enabled);
    t.false((await getWindowConfig(child.identity)).enabled);

    await child.close();

    t.true((await getWindowConfig(app.identity)).enabled);
    t.true((await getWindowConfig(child.identity)).enabled);
});
