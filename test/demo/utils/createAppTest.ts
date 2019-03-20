import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {delay} from '../../provider/utils/delay';

import {AppInitializer, AppInitializerParams, TestAppData, WindowGrouping} from './AppInitializer';
import {TestMacro, ContextTestMacro} from './parameterizedTestUtils';

export interface CreateAppData {
    apps: AppInitializerParams[];
    snapWindowGrouping?: WindowGrouping;
    tabWindowGrouping?: WindowGrouping;
}

export interface AppContext {
    testAppData: TestAppData[];
    appInitializer: AppInitializer;
    windows: _Window[];
}

export function createAppTest<T extends CreateAppData>(
    testFunc: ContextTestMacro<T, AppContext>, apps?: AppInitializerParams[]): TestMacro<T> {
    const appInitializer: AppInitializer = new AppInitializer();

    return async (data: T) => {
        // Create all apps
        const testAppData: TestAppData[] = await appInitializer.initApps(data.apps);


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
        const context = {testAppData, appInitializer, windows};

        try {
            await testFunc(context, data);
        } finally {
            // Close all windows
            await Promise.all(testAppData.map(async appData => await appData.app.close(true)));
            await delay(500);
        }
    };
}