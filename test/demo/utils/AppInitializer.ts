import {Application} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from '../../provider/utils/connect';
import {createChildWindow} from '../../provider/utils/createChildWindow';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';

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

export type AppInitializerInfo = ProgrammaticTestParams|ManifestTestParams;

export interface TestAppData {
    uuid: string;
    app: Application;
    mainWindow: _Window;
    children: _Window[];
}

const CHILD_WINDOW_BASE = {
    url: `http://localhost:1337/test/demo-window.html`,
    autoShow: true,
    defaultHeight: 250,
    defaultWidth: 250,
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
    defaultHeight: 250,
    defaultWidth: 250
};

const APP_INITIALIZER_BASE = {
    appOptions: OPTIONS_BASE,
    createType: 'programmatic',
    childWindows: []
};

function childYCoordinate(appNum: number, childNum: number) {
    return (appNum * 275) + (childNum * 50) + 100;
}

function childXCoordinate(appNum: number, childNum: number) {
    return ((appNum + childNum) * 280) + 300;
}

function appYCoordinate(appTitleNumber: number) {
    return ((appTitleNumber - 1) * 275) + 50;
}

let appTitleNumber = 0;

export function createAppsArray(numAppsToCreate: number, numberOfChildren: number) {
    const appsArray = [];
    while (numAppsToCreate > 0) {
        // Set the app information
        appTitleNumber++;
        const id = 'test-app' + appTitleNumber;

        // Set the child window information
        const childWindows = [];
        let childTitleNumber = numberOfChildren;
        while (childTitleNumber > 0) {
            childWindows.push({name: `test${appTitleNumber}-child${childTitleNumber}`});
            childTitleNumber--;
        }

        // Save the app information
        const defaultTop = appYCoordinate(numAppsToCreate);
        const appOptions = {...OPTIONS_BASE, uuid: id, name: id, defaultTop, defaultLeft: 100};
        appsArray.push({...APP_INITIALIZER_BASE, appOptions, childWindows});

        numAppsToCreate--;
    }

    return appsArray;
}

// A WindowGrouping is an array of array of numbers that corresponds to two windows grouped.
// e.g. [[0, 1], [2, 3]] would mean that out of an array of 4 windows, win0 and win1 should be grouped, and win2 and win3 should be grouped.
export type WindowGrouping = number[][];

// createWindowGroupings takes a number of apps and children, and creates a 1-to-1 mapping of all combinations of apps and child windows.
// For simplicity, we're supporting up to 4 windows right now, but this is meant to be extended.
export function createWindowGroupings(numApps: number, children: number): WindowGrouping[] {
    const totalWindows = (numApps) + (numApps * children);

    switch (totalWindows) {
        case 2:
            return [[[0, 1]]];
        case 4:
            return [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
        default:
            return [];
    }
}

export class AppInitializer {
    constructor() {}

    public async initApps(params: AppInitializerInfo[]): Promise<TestAppData[]> {
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
                const defaultTop = childYCoordinate(appIdx, childIdx);
                const defaultLeft = childXCoordinate(appIdx, childIdx);
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
            const win1 = windows[group[0]];
            const win2 = windows[group[1]];
            await dragSideToSide(win1, 'left', win2, 'right');
        }
    }

    public async tabWindows(tabWindowGrouping: WindowGrouping, windows: _Window[]): Promise<void> {
        for (const group of tabWindowGrouping) {
            const win1 = windows[group[0]];
            const win2 = windows[group[1]];
            await tabWindowsTogether(win1, win2);
        }
    }
}
