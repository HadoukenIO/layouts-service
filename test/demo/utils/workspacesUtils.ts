import {Context, GenericTestContext, Test, TestContext} from 'ava';

import {getConnection} from '../../provider/utils/connect';

import {AppInitializerInfo, TestApp} from './AppInitializer';
import {AppContext} from './createAppTest';
import {sendServiceMessage} from './serviceUtils';

type SaveRestoreTestContext = GenericTestContext<Context<AppContext>>;

async function isWindowActive(uuid: string, name: string) {
    const fin = await getConnection();
    const allWindows = await fin.System.getAllWindows();

    let pass = false;

    allWindows.forEach((win) => {
        if (win.uuid === uuid) {
            if (uuid === name) {
                pass = true;
                return;
            }
            win.childWindows.forEach((childWin) => {
                if (childWin.name === name) {
                    pass = true;
                    return;
                }
            });
        }
    });

    return pass;
}

export async function assertWindowRestored(t: SaveRestoreTestContext, uuid: string, name: string) {
    const active = await isWindowActive(uuid, name);
    active ? t.pass() : t.fail(`Window ${uuid}:${name} was not restored`);
}

export async function assertWindowNotRestored(t: SaveRestoreTestContext, uuid: string, name: string) {
    const active = await isWindowActive(uuid, name);
    active ? t.fail(`Window ${uuid}:${name} was restored when it should not have been`) : t.pass();
}

export async function createCloseAndRestoreLayout(t: SaveRestoreTestContext) {
    const generatedLayout = await sendServiceMessage('generateLayout', undefined);
    await Promise.all(t.context.testAppData.map(async (appData: TestApp) => await appData.app.close(true)));
    await sendServiceMessage('restoreLayout', generatedLayout);
}

export const OPTIONS_BASE = {
    uuid: 'BASE',
    url: 'http://localhost:1337/test/registeredApp.html',
    name: 'BASE',
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 250,
    defaultWidth: 250
};

export const APP_INITIALIZER_BASE = {
    appOptions: OPTIONS_BASE,
    createType: 'programmatic',
    childWindows: []
};

export function appYCoordinate(appTitleNumber: number) {
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


export function createBasicSaveAndRestoreTest(numAppsToCreate: number, numberOfChildren: number): {apps: AppInitializerInfo[]} {
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren);

    return {apps: appsArray as AppInitializerInfo[]};
}

export function createWindowGroupings(numApps: number, children: number) {
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

export function createSnapTests(numApps: number, children: number): {apps: AppInitializerInfo[], snapWindowGrouping: number[][]}[] {
    const windowGroupings = createWindowGroupings(numApps, children);
    const appsArray = createAppsArray(numApps, children);

    const result = [];

    for (const windowGrouping of windowGroupings) {
        result.push({apps: appsArray as AppInitializerInfo[], snapWindowGrouping: windowGrouping});
    }

    return result;
}

export function createTabTests(numApps: number, children: number): {apps: AppInitializerInfo[], tabWindowGrouping: number[][]}[] {
    const windowGroupings = createWindowGroupings(numApps, children);
    const appsArray = createAppsArray(numApps, children);

    const result = [];

    for (const windowGrouping of windowGroupings) {
        result.push({apps: appsArray as AppInitializerInfo[], tabWindowGrouping: windowGrouping});
    }

    return result;
}