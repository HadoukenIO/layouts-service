import {Application} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {getConnection} from '../../provider/utils/connect';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {TestCreationOptions} from './workspacesUtils';

interface TestParamBase {
    childWindows: fin.WindowOptions[];
}

interface ProgrammaticTestParams extends TestParamBase {
    createType: 'programmatic';
    appOptions: fin.ApplicationOptions;
}

interface ManifestTestParams extends TestParamBase {
    createType: 'manifest';
    manifestUrl: string;
}

export type AppInitializerParams = ProgrammaticTestParams|ManifestTestParams;

export interface TestAppData {
    uuid: string;
    app: Application;
    mainWindow: _Window;
    children: _Window[];
}

const CHILD_WINDOW_BASE = {
    url: `http://localhost:1337/test/demo-window.html`,
    autoShow: true,
    defaultHeight: 225,
    defaultWidth: 225,
    defaultLeft: 200,
    defaultTop: 200,
    saveWindowState: false,
    frame: true,
    name: 'BASE'
};

const OPTIONS_BASE = {
    uuid: 'BASE',
    url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false',
    name: 'BASE',
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 225,
    defaultWidth: 225
};

const APP_INITIALIZER_BASE_PROGRAMMATIC: ProgrammaticTestParams = {
    appOptions: OPTIONS_BASE,
    createType: 'programmatic',
    childWindows: []
};

const APP_INITIALIZER_BASE_MANIFEST: ManifestTestParams = {
    createType: 'manifest',
    childWindows: [],
    manifestUrl: ''
};

let appTitleNumber = 0;

export function createAppsArray(numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions): AppInitializerParams[] {
    const appsArray = [];
    let appsCreated = 0;
    while (appsCreated < numAppsToCreate) {
        // Set the app information
        appTitleNumber++;
        const id = 'save-restore-test-app' + Math.random().toString(36).substring(2);

        // Set the child window information
        const childWindows = [];
        let childTitleNumber = numberOfChildren;
        while (childTitleNumber > 0) {
            childWindows.push({name: `test${appTitleNumber}-child${childTitleNumber}`});
            childTitleNumber--;
        }

        // Save the app information
        const defaultTop = (appsCreated * 290) + 50;
        const appOptions = {...OPTIONS_BASE, ...testOptions, uuid: id, name: id, defaultTop, defaultLeft: 100};

        let appInitializerOptions: AppInitializerParams = {...APP_INITIALIZER_BASE_PROGRAMMATIC, appOptions, childWindows};

        if (testOptions) {
            if (testOptions.autoShow === false) {
                appInitializerOptions.appOptions.mainWindowOptions = Object.assign({}, appInitializerOptions.appOptions.mainWindowOptions, {autoShow: false});
            }

            if (testOptions.manifest && testOptions.url) {
                appInitializerOptions = {...APP_INITIALIZER_BASE_MANIFEST, childWindows};
                appInitializerOptions.manifestUrl =
                    `http://localhost:1337/create-manifest?defaultTop=${defaultTop}&uuid=${id}&url=${encodeURIComponent(`${testOptions.url}`)}`;
                if (testOptions.autoShow === false) {
                    appInitializerOptions.manifestUrl += `&autoShow=false`;
                }
            }
        }

        appsArray.push(appInitializerOptions);

        appsCreated++;
    }

    return appsArray;
}

// A WindowGrouping is an array of array of numbers that corresponds to two windows grouped.
// e.g. [[0, 1], [2, 3]] would mean that out of an array of 4 windows, win0 and win1 should be grouped, and win2 and win3 should be grouped.
export type WindowGrouping = {group: number[], expectSuccess?: boolean}[];

type WindowGroupingInternal = number[][];

// createWindowGroupings takes a number of apps and children, and creates a 1-to-1 mapping of all combinations of apps and child windows.
// For simplicity, we're supporting up to 4 windows right now, but this is meant to be extended.
export function createWindowGroupings(numApps: number, children: number): WindowGrouping[] {
    const totalWindows = (numApps) + (numApps * children);
    const indexArray = [];

    for (let index = 0; index < totalWindows; index++) {
        indexArray.push(index);
    }

    return createWindowPairs(indexArray).map(groupingInternal => groupingInternal.map(subGroupingInternal => ({group: subGroupingInternal})));
}

function createWindowPairs(windows: number[]): WindowGroupingInternal[] {
    const result: WindowGroupingInternal[] = [];
    if (windows.length <= 2) {
        return [[windows]];
    } else {
        const a = windows[0];
        for (let index = 1; index < windows.length; index++) {
            const b = windows[index];
            const pair = [a, b];
            const newArray = windows.slice(1, index).concat(windows.slice(index + 1, windows.length));

            const subCombinations = createWindowPairs(newArray);
            subCombinations.forEach(subCombo => {
                result.push([pair].concat(subCombo));
            });
        }
    }
    return result;
}

export class AppInitializer {
    constructor() {}

    public async initApps(params: AppInitializerParams[]): Promise<TestAppData[]> {
        const fin = await getConnection();
        const result: TestAppData[] = [];

        for (let appIdx = 0; appIdx < params.length; appIdx++) {
            const param = params[appIdx];

            // Create the parent app
            let createdApp: Application;
            if (param.createType === 'programmatic') {
                createdApp = await fin.Application.create(param.appOptions);
            } else {
                createdApp = await fin.Application.createFromManifest(param.manifestUrl);
            }

            await createdApp.run();

            // Delay to give the app time to start up
            await delay(300);

            // Create its child windows
            const childWindows: _Window[] = [];
            for (let childIdx = 0; childIdx < param.childWindows.length; childIdx++) {
                const child = param.childWindows[childIdx];
                const defaultTop = (appIdx * 275) + (childIdx * 50) + 100;
                const defaultLeft = ((appIdx + childIdx) * 280) + 450;
                const childOptions = {...CHILD_WINDOW_BASE, defaultLeft, defaultTop, ...child};
                const childWindow = await createChildWindow(childOptions, createdApp.identity.uuid);

                childWindows.push(childWindow);
            }

            // Save the information in the array
            result.push({
                uuid: createdApp.identity.uuid,
                app: createdApp,
                mainWindow: await createdApp.getWindow(),
                children: childWindows,
            });
        }

        return result;
    }

    public async snapWindows(snapWindowGrouping: WindowGrouping, windows: _Window[]): Promise<void> {
        for (const group of snapWindowGrouping) {
            const win1 = windows[group.group[0]];
            const win2 = windows[group.group[1]];
            await dragSideToSide(win1, 'left', win2, 'right');
        }
    }

    public async tabWindows(tabWindowGrouping: WindowGrouping, windows: _Window[]): Promise<void> {
        for (const group of tabWindowGrouping) {
            const win1 = windows[group.group[0]];
            const win2 = windows[group.group[1]];
            await tabWindowsTogether(win1, win2, group.expectSuccess !== undefined ? group.expectSuccess : true);
        }
    }
}
