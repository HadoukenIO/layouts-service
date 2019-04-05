import {Window} from 'hadouken-js-adapter';

import {delay} from '../../provider/utils/delay';
import {ArrangementsType, WindowInitializer, WindowPosition} from '../../provider/utils/WindowInitializer';

import {ContextTestMacro, TestMacro} from './parameterizedTestUtils';

const windowOptionsBase = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 250,
    defaultWidth: 250,
    url: 'http://localhost:1337/demo/popup.html'
};

export interface CreateWindowData {
    frame: boolean;
    windowCount: number;
    arrangement?: string;
}

export interface WindowContext {
    windows: Window[];
    windowInitializer: WindowInitializer;
}

export function createWindowTest<T extends CreateWindowData>(
    testFunc: ContextTestMacro<T, WindowContext>,
    windowOptions?: fin.WindowOptions,
    customArrangements?: ArrangementsType,
    customWindowPositions?: WindowPosition[]): TestMacro<T> {
    const options: fin.WindowOptions = Object.assign({}, windowOptionsBase, windowOptions);
    const framedInitializer: WindowInitializer = new WindowInitializer(customArrangements, customWindowPositions, Object.assign({}, options, {frame: true}));
    const framelessInitializer: WindowInitializer =
        new WindowInitializer(customArrangements, customWindowPositions, Object.assign({}, options, {frame: false}));

    return async (data: T) => {
        const {frame, windowCount} = data;

        // Create all windows
        const windowInitializer = frame ? framedInitializer : framelessInitializer;
        const windows: Window[] = await windowInitializer.initWindows(windowCount, data.arrangement);
        const context = {windows, windowInitializer};

        // Delay slightly to allow windows to initialize
        await delay(300);

        try {
            await testFunc(context, data);
        } finally {
            // Close all windows
            await Promise.all(windows.map(win => win.close()));
            // await delay(500);
        }
    };
}