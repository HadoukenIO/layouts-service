import {Context, GenericTestContext} from 'ava';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {delay} from '../../provider/utils/delay';

import {AppInitializer, AppInitializerInfo, TestApp, WindowGrouping} from './AppInitializer';
import {TestMacro} from './parameterizedTestUtils';

export interface CreateAppData {
    apps: AppInitializerInfo[];
    snapWindowGrouping?: WindowGrouping;
    tabWindowGrouping?: WindowGrouping;
}

export interface AppContext {
    testAppData: TestApp[];
    appInitializer: AppInitializer;
    windows: _Window[];
}

export function createAppTest<T extends CreateAppData, C extends AppContext = AppContext>(
    testFunc: TestMacro<T, C>, apps?: AppInitializerInfo[]): TestMacro<T, C> {
    const appInitializer: AppInitializer = new AppInitializer();

    return async (t: GenericTestContext<Context<C>>, data: T) => {
        // Create all apps
        const testAppData: TestApp[] = await appInitializer.initApps(data.apps);


        // Delay slightly to allow windows to initialize
        await delay(300);

        // Snap windows together
        const windows: _Window[] = [];
        testAppData.forEach((testData) => {
            windows.push(testData.mainWindow);
            testData.children.forEach((childWindow) => {
                windows.push(childWindow);
            });
        });

        data.snapWindowGrouping = data.snapWindowGrouping || [];
        await appInitializer.snapWindows(data.snapWindowGrouping, windows);

        // Delay slightly to allow windows to settle
        await delay(300);

        data.tabWindowGrouping = data.tabWindowGrouping || [];
        await appInitializer.tabWindows(data.tabWindowGrouping, windows);

        // Delay slightly to allow windows to settle
        await delay(300);

        // Set context variables
        t.context.testAppData = testAppData;
        t.context.appInitializer = appInitializer;
        t.context.windows = windows;

        try {
            await testFunc(t, data);
        } finally {
            // Close all windows
            await Promise.all(testAppData.map(async appData => await appData.app.close(true)));
            await delay(500);
        }
    };
}