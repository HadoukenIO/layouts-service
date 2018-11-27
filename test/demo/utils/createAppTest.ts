import {Context, GenericTestContext} from 'ava';

import {delay} from '../../provider/utils/delay';

import {AppInitializer, AppInitializerInfo, TestApp} from './AppInitializer';
import {TestMacro} from './parameterizedTestUtils';

export interface CreateAppData {
    apps: AppInitializerInfo[];
}

export interface AppContext {
    testAppData: TestApp[];
    appInitializer: AppInitializer;
}

export function createAppTest<T extends CreateAppData, C extends AppContext = AppContext>(
    testFunc: TestMacro<T, C>, apps?: AppInitializerInfo[]): TestMacro<T, C> {
    const appInitializer: AppInitializer = new AppInitializer();

    return async (t: GenericTestContext<Context<C>>, data: T) => {
        // Create all apps
        const testAppData: TestApp[] = await appInitializer.initApps(data.apps);
        t.context.testAppData = testAppData;
        t.context.appInitializer = appInitializer;

        // Delay slightly to allow windows to initialize
        await delay(300);

        try {
            await testFunc(t, data);
        } finally {
            // Close all windows
            await Promise.all(testAppData.map(async appData => await appData.app.close(true)));
            await delay(500);
        }
    };
}