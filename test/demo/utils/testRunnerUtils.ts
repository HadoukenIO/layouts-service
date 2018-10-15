import {Context, GenericTestContext, RegisterContextual, test} from 'ava';
import deepEqual from 'fast-deep-equal';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from '../../provider/utils/connect';
import {delay} from '../../provider/utils/delay';
import {WindowInitializer, WindowOptions} from '../../provider/utils/WindowInitializer';



export type SnapDockTestContext = {
    windows: _Window[]
};

export const testContextual: RegisterContextual<SnapDockTestContext> = test;

export type SnapDockTest = GenericTestContext<Context<SnapDockTestContext>>;

export interface TestOptionsBase {
    numWindows: number;
    frame: FrameState;
}

export type TestIdentifier<T extends TestOptionsBase> = T&{name: string};

export interface TestMacroBase<T extends TestOptionsBase> {
    (t: SnapDockTest, options: T): void;
    title?(providedTitle: string, options: T): string;
}

const frameStateMapping = {
    'framed': true,
    'frameless': false,
};
export type FrameState = keyof typeof frameStateMapping;

const windowOptionsBase = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 250,
    defaultWidth: 250,
    url: 'http://localhost:1337/demo/frameless-window.html'
};

export class TestHelper<OptionsType extends TestOptionsBase> {
    private windowOptions: Partial<fin.WindowOptions>;
    private windowInitializer: {[f in FrameState]: WindowInitializer};

    private skippedTests: TestIdentifier<OptionsType>[];
    private failingTests: TestIdentifier<OptionsType>[];

    constructor(skippedTests: TestIdentifier<OptionsType>[], failingTests: TestIdentifier<OptionsType>[], windowOptions?: WindowOptions) {
        this.windowOptions = Object.assign({}, windowOptionsBase, windowOptions);
        this.windowInitializer = {
            'framed': new WindowInitializer(undefined, undefined, Object.assign({}, this.windowOptions, {frame: frameStateMapping['framed']})),
            'frameless': new WindowInitializer(undefined, undefined, Object.assign({}, this.windowOptions, {frame: frameStateMapping['frameless']}))
        };

        this.skippedTests = skippedTests;
        this.failingTests = failingTests;

        testContextual.before(async () => {
            await getConnection();
        });

        // Cleanup any residual windows once the test finishes or otherwise ends
        testContextual.afterEach.always(async (t: SnapDockTest) => {
            // Close all windows
            await Promise.all(t.context.windows.map(win => win.close()));
        });
    }

    public async spawnBasicSnapWindows(t: SnapDockTest, testOptions: OptionsType, arrangement?: string) {
        const {frame, numWindows} = testOptions;
        // Create all windows
        t.context.windows = await this.windowInitializer[frame].initWindows(numWindows, arrangement);

        // Delay slightly to allow windows to initialize
        await delay(300);

        return t.context.windows;
    }

    /**
     *  Helper function to keep type-safety when invoking tests.
     * Also allows skipping or failing tests by adding them to the arrays at the top of the file.
     */
    public runTest<T extends TestOptionsBase>(name: string, macro: TestMacroBase<T>, testOptions: T) {
        const currentTest = Object.assign(testOptions, {name});
        if (this.skippedTests.some(skippedTest => deepEqual(skippedTest, currentTest))) {
            testContextual.skip(name, macro, testOptions);
        } else if (this.failingTests.some(failingTest => deepEqual(failingTest, currentTest))) {
            testContextual.failing(name, macro, testOptions);
        } else {
            testContextual(name, macro, testOptions);
        }
    }
}