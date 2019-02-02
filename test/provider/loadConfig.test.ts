import test from 'ava';
import {Application, Fin} from 'hadouken-js-adapter';

import {ConfigurationObject} from '../../gen/provider/config/layouts-config';
import {ConfigWithRules} from '../../src/provider/config/Store';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {getAppState, getWindowConfig} from './utils/config';
import {getConnection} from './utils/connect';
import {delay} from './utils/delay';

let fin: Fin;
let app: Application;

const uuid = 'test-app-config';

test.before(async () => {
    fin = await getConnection();
});
test.afterEach.always(teardown);

async function createAppWithConfig(uuid: string, config: ConfigWithRules<ConfigurationObject>): Promise<Application> {
    const url = `http://localhost:1337/create-manifest?uuid=${uuid}&config=${encodeURIComponent(JSON.stringify(config))}`;
    const app = await fin.Application.createFromManifest(url);
    await app.run();
    return app;
}

test('Config is loaded from an application\'s manifest', async (t) => {
    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.log('\nTest 1\n');
        console.log(this.config['_cache']);
        console.log(this.config.query({level: 'window', uuid: 'test-app-config', name: 'test-app-config'}));
    });
    const identity = {uuid, name: uuid};

    console.log('A0');
    app = await createAppWithConfig(uuid, {enabled: false});
    console.log('A1');

    // Config specifies that window shouldn't be registered
    const config = await getWindowConfig(identity);
    t.false(config.enabled);

    // Window isn't registered within model
    t.false(await isWindowRegistered(identity));

    console.log(await getWindowConfig(identity));

    await app.close();

    console.log('A2');
    console.log(await executeJavascriptOnService(function(this: ProviderWindow) {
        return this.config['_items'].get('application');
    }));

    await delay(1000);

    console.log('A3');
    console.log(await executeJavascriptOnService(function(this: ProviderWindow) {
        return this.config['_items'].get('application');
    }));
});

test('Config is unloaded when the application exits', async (t) => {
    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.log('\nTest 2\n');
        console.log(this.config['_cache']);
        console.log(this.config.query({level: 'window', uuid: 'test-app-config', name: 'test-app-config'}));
    });
    const identity = {uuid, name: uuid};

    console.log('B0');
    console.log(await executeJavascriptOnService(function(this: ProviderWindow) {
        return this.config['_items'].get('application');
    }));

    app = await createAppWithConfig(uuid, {});
    console.log('B1');
    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.log('\nTest 2\n');
        console.log(this.config['_cache']);
        console.log(this.config.query({level: 'window', uuid: 'test-app-config', name: 'test-app-config'}));
    });

    const preConfig = await getWindowConfig(identity);
    console.log(preConfig);

    console.log(await executeJavascriptOnService(function(this: ProviderWindow) {
        return this.config['_items'].get('application');
    }));
    console.log('B2');

    // Sanity check - make sure config was definitely loaded initially
    t.false(preConfig.enabled);

    await app.close();

    // App-specific config has been removed, querying 'enabled' returns the default value of true
    const postConfig = await getWindowConfig(identity);
    console.log(postConfig);
    t.true(postConfig.enabled);
    console.log('B3');
});

test('If an application creates a child application, the config of the parent application persists for the lifecycle of its child', async (t) => {
    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.log('\nTest 3\n');
        console.log(this.config['_cache']);
        console.log(this.config.query({level: 'window', uuid: 'test-app-config', name: 'test-app-config'}));
    });
    const identity = {uuid, name: uuid};

    app = await createAppWithConfig(uuid, {enabled: false});

    const preConfig = await getWindowConfig(identity);

    // Sanity check - make sure config was definitely loaded initially
    t.false(preConfig.enabled);

    await app.close();

    // App-specific config has been removed, querying 'enabled' returns the default value of true
    const postConfig = await getWindowConfig(identity);
    t.true(postConfig.enabled);

    // await delay(500000);
});
