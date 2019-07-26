import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';

import {teardown} from '../teardown';
import {WindowState} from '../../src/client/workspaces';
import {Rectangle} from '../../src/provider/snapanddock/utils/RectUtils';
import {setBounds, getEntityBounds} from '../provider/utils/bounds';
import {promiseForEach} from '../../src/provider/snapanddock/utils/async';
import {tabbing} from '../../src/client/main';
import {assertCompleteGroup, assertCompleteTabGroup} from '../provider/utils/assertions';

import {executeJavascriptOnService} from './utils/serviceUtils';
import {CreateWindowData, createWindowTest, WindowContext} from './utils/createWindowTest';
import {itParameterized} from './utils/parameterizedTestUtils';
import {getTabGroupID} from './utils/tabServiceUtils';

interface MonitorAssignmentValidatorTestOptions extends CreateWindowData {
    initialPositions: {state: WindowState, bounds: Bounds}[];
    initialGrouping: {snap: number[][], tab: number[][]};

    description: string;
    expectedBounds: Bounds[];
    expectedGrouping: {snap: number[][], tab: number[][]};
}

const smallMonitor = {center: {x: 300, y: 300}, halfSize: {x: 250, y: 250}};

const options: MonitorAssignmentValidatorTestOptions[] = [
    {
        description: 'A window off the top left of the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 0, left: 10, height: 250, width: 250}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 50, left: 50, height: 250, width: 250}
        ],
        frame: false,
        windowCount: 1
    },
    {
        description: 'A window off the bottom right of the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 400, left: 300, height: 250, width: 250}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 300, left: 300, height: 250, width: 250}
        ],
        frame: false,
        windowCount: 1
    },
    {
        description: 'Two windows off each side of the monitor are moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 100, left: 20, height: 250, width: 250}},
            {state: 'normal', bounds: {top: 120, left: 600, height: 250, width: 250}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 100, left: 50, height: 250, width: 250},
            {top: 120, left: 300, height: 250, width: 250}
        ],
        frame: false,
        windowCount: 2
    },
    {
        description: 'A vertical snap group with windows off the top of the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: -100, left: 100, height: 100, width: 100}},
            {state: 'normal', bounds: {top: 0, left: 100, height: 100, width: 100}},
            {state: 'normal', bounds: {top: 100, left: 100, height: 100, width: 100}}
        ],
        initialGrouping: {snap: [[0, 1, 2]], tab: []},
        expectedGrouping: {snap: [[0, 1, 2]], tab: []},
        expectedBounds: [
            {top: 50, left: 100, height: 100, width: 100},
            {top: 150, left: 100, height: 100, width: 100},
            {top: 250, left: 100, height: 100, width: 100}
        ],
        frame: false,
        windowCount: 3
    },
    {
        description: 'A horizontal snap group too wide to fit within the monitor is split and moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 100, left: -1000, height: 100, width: 200}},
            {state: 'normal', bounds: {top: 100, left: -800, height: 100, width: 200}},
            {state: 'normal', bounds: {top: 100, left: -600, height: 100, width: 200}},
            {state: 'normal', bounds: {top: 100, left: -400, height: 100, width: 200}}
        ],
        initialGrouping: {snap: [[0, 1, 2, 3]], tab: []},
        expectedGrouping: {snap: [[0], [1, 2], [3]], tab: []},
        expectedBounds: [
            {top: 100, left: 50, height: 100, width: 200},
            {top: 100, left: 100, height: 100, width: 200},
            {top: 100, left: 300, height: 100, width: 200},
            {top: 100, left: 350, height: 100, width: 200}
        ],
        frame: false,
        windowCount: 4
    },
    {
        description: 'A window too tall for the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 300, left: 100, height: 1000, width: 250}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 50, left: 100, height: 1000, width: 250}
        ],
        frame: false,
        windowCount: 1
    },
    {
        description: 'A window too wide for the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 100, left: 100, height: 300, width: 800}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 100, left: -100, height: 300, width: 800}
        ],
        frame: false,
        windowCount: 1
    },
    {
        description: 'A maximized window, with restore bounds partially outside the monitor, is moved as expected',
        initialPositions: [
            {state: 'maximized', bounds: {top: 150, left: 150, width: 450, height: 200}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 150, left: 100, width: 450, height: 200}
        ],
        frame: false,
        windowCount: 1
    },
    {
        description: 'A minimized window, with restore bounds partially outside the monitor, is moved as expected',
        initialPositions: [
            {state: 'minimized', bounds: {top: 300, left: 50, width: 300, height: 400}}
        ],
        initialGrouping: {snap: [], tab: []},
        expectedGrouping: {snap: [], tab: []},
        expectedBounds: [
            {top: 150, left: 50, width: 300, height: 400}
        ],
        frame: false,
        windowCount: 1
    },
    {
        description: 'A tabbed window off the bottom of the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: 400, left: 100, width: 350, height: 300}},
            {state: 'normal', bounds: {top: 400, left: 100, width: 350, height: 300}},
            {state: 'normal', bounds: {top: 400, left: 100, width: 350, height: 300}}
        ],
        initialGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedBounds: [
            {top: 250, left: 100, width: 350, height: 300},
            {top: 250, left: 100, width: 350, height: 300},
            {top: 250, left: 100, width: 350, height: 300}
        ],
        frame: false,
        windowCount: 3
    },
    {
        description: 'A tabbed window off the top of the monitor is moved as expected',
        initialPositions: [
            {state: 'normal', bounds: {top: -150, left: 200, width: 300, height: 300}},
            {state: 'normal', bounds: {top: -150, left: 200, width: 300, height: 300}},
            {state: 'normal', bounds: {top: -150, left: 200, width: 300, height: 300}}
        ],
        initialGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedBounds: [
            {top: 50, left: 200, width: 300, height: 300},
            {top: 50, left: 200, width: 300, height: 300},
            {top: 50, left: 200, width: 300, height: 300}
        ],
        frame: false,
        windowCount: 3
    },
    {
        description: 'A maximized tabbed window, with restore bounds partially outside the monitor, is moved as expected',
        initialPositions: [
            {state: 'maximized', bounds: {top: -100, left: 400, width: 300, height: 300}},
            {state: 'normal', bounds: {top: 100, left: 100, width: 200, height: 200}},
            {state: 'normal', bounds: {top: 100, left: 100, width: 200, height: 200}}
        ],
        initialGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedBounds: [
            {top: 50, left: 250, width: 300, height: 300},
            {top: 50, left: 250, width: 300, height: 300},
            {top: 50, left: 250, width: 300, height: 300}
        ],
        frame: false,
        windowCount: 3
    },
    // Strange things happen if we call `tabbing.minimizeTabGroup()` on offscreen tabs, so we make sure these are within our original monitor
    {
        description: 'A minimized tabbed window, with restore bounds partially outside the monitor, is moved as expected',
        initialPositions: [
            {state: 'minimized', bounds: {top: 500, left: 400, width: 300, height: 300}},
            {state: 'normal', bounds: {top: 100, left: 100, width: 200, height: 200}},
            {state: 'normal', bounds: {top: 100, left: 100, width: 200, height: 200}}
        ],
        initialGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedGrouping: {snap: [], tab: [[0, 1, 2]]},
        expectedBounds: [
            {top: 250, left: 250, width: 300, height: 300},
            {top: 250, left: 250, width: 300, height: 300},
            {top: 250, left: 250, width: 300, height: 300}
        ],
        frame: false,
        windowCount: 3
    }
];

let initialMonitors: Rectangle[] = [];

beforeAll(async () => {
    initialMonitors = await getMonitors();
});

afterEach(async() => {
    await setMonitors(initialMonitors);
});

afterAll(teardown);

itParameterized<MonitorAssignmentValidatorTestOptions>(
    'When validating monitor assignment, windows are moved as expected',
    (testOptions: MonitorAssignmentValidatorTestOptions): string => `${testOptions.description}`,
    options,
    createWindowTest(async (context: WindowContext, testOptions: MonitorAssignmentValidatorTestOptions) => {
        // Setup windows
        await setupWindows(context, testOptions);

        // Apply monitor size and run validation
        await applyMonitorChange();

        // Check end windows state matched expectations
        await checkWindows(context, testOptions);
    })
);

async function setupWindows(context: WindowContext, testOptions: MonitorAssignmentValidatorTestOptions): Promise<void> {
    await setupWindowPositions(context, testOptions);
    await setupSnapAndTabGroups(context, testOptions);
}

async function applyMonitorChange(): Promise<void> {
    await setMonitors([smallMonitor]);

    await executeJavascriptOnService(async function (this: ProviderWindow): Promise<void> {
        await this.model['_monitorAssignmentValidator'].validate();
    });
}

async function checkWindows(context: WindowContext, testOptions: MonitorAssignmentValidatorTestOptions): Promise<void> {
    // Assert bounds are as expected
    for (let i = 0; i < context.windows.length; i++) {
        const window = context.windows[i];
        const expectedBounds = testOptions.expectedBounds[i];

        // Restore the tab group, as the most convienient way to get at its restore bounds
        if (await getTabGroupID(window.identity)) {
            await tabbing.restoreTabGroup(window.identity);
        }

        if (expectedBounds) {
            expect(await getEntityBounds(window)).toMatchObject(expectedBounds);
        }
    }

    // Assert tab and snap groups are as expected
    for (const snapGroup of testOptions.expectedGrouping.snap) {
        await assertCompleteGroup(...snapGroup.map(index => context.windows[index]));
    }

    for (const tabGroup of testOptions.expectedGrouping.tab) {
        await assertCompleteTabGroup(...tabGroup.map(index => context.windows[index]));
    }
}

async function setupWindowPositions(context: WindowContext, testOptions: MonitorAssignmentValidatorTestOptions): Promise<void> {
    for (let i = 0; i < context.windows.length; i++) {
        const position = testOptions.initialPositions[i];

        const window = context.windows[i];

        if (position.bounds) {
            await setBounds(context.windows[i], position.bounds);
        }

        if (position.state === 'maximized') {
            await window.maximize();
        } else if (position.state === 'minimized') {
            await window.minimize();
        }
    }
}

async function setupSnapAndTabGroups(context: WindowContext, testOptions: MonitorAssignmentValidatorTestOptions) {
    await promiseForEach(testOptions.initialGrouping.snap, async (snapGroup) => {
        const [rootWindow, ...windows] = context.windows;

        for (const window of windows) {
            await window.joinGroup(rootWindow);
        }
    });

    await promiseForEach(testOptions.initialGrouping.tab, async (tabGroup) => {
        if (tabGroup.length > 1) {
            const windows = tabGroup.map(index => context.windows[index]);

            // Weird stuff happens if we try to tab together minimized tabs, so unminimize
            await promiseForEach(tabGroup, async tabIndex => {
                if (testOptions.initialPositions[tabIndex].state === 'minimized') {
                    await context.windows[tabIndex].restore();
                }
            });

            await tabbing.createTabGroup(windows.map(window => window.identity));

            // If the initial tab was minimized, we want the tab group as a whole minimized
            if (testOptions.initialPositions[tabGroup[0]].state === 'minimized') {
                await tabbing.minimizeTabGroup(windows[0].identity);
            }
        }
    });
}

async function getMonitors(): Promise<Rectangle[]> {
    return executeJavascriptOnService(async function (this: ProviderWindow): Promise<Rectangle[]> {
        return this.model['_monitors'];
    });
}

async function setMonitors(monitors: Rectangle[]): Promise<void> {
    await executeJavascriptOnService(async function (this: ProviderWindow, monitors: Rectangle[]): Promise<void> {
        this.model['_monitors'] = monitors;
    }, monitors);
}

