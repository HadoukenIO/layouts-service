import {Context, GenericTestContext, Test, TestContext} from 'ava';

import {getConnection} from '../../provider/utils/connect';

import {AppInitializerInfo, TestApp} from './AppInitializer';
import {AppContext} from './createAppTest';
import {sendServiceMessage} from './serviceUtils';

type SaveRestoreTestContext = GenericTestContext<Context<AppContext>>;


// export async function createApp(t: SaveRestoreTestContext, uuid: string, registration: string, top?: number, left?: number) {
//     const registered = registration === 'registered';
//     const fin = await getConnection();
//     const app = await fin.Application.create({
//         uuid,
//         url: registered ? 'http://localhost:1337/test/registeredApp.html' : 'http://localhost:1337/test/deregisteredApp.html',
//         name: uuid,
//         mainWindowOptions: {autoShow: true, saveWindowState: false, defaultTop: top || 200, defaultLeft: left || 200, defaultHeight: 300, defaultWidth: 300}
//     });
//     t.context.apps.push(app);
//     await app.run();
//     if (!registered) {
//         // Delay to allow the window to deregister from the service.
//         await delay(500);
//     }
//     return app;
// }

// export async function createCloseAndRestoreLayoutOLD(t: SaveRestoreTestContext, windowCreationFunction: PassFunction, pass: boolean) {
//     const fin = await getConnection();
//     const generatedLayout = await sendServiceMessage('generateLayout', undefined);
//     await Promise.all(t.context.apps.map((app: Application) => app.close()));
//     await fin.System.addListener('window-created', windowCreationFunction);
//     await sendServiceMessage('restoreLayout', generatedLayout);
//     setTimeout(() => {
//         if (!pass) {
//             t.context.y();
//             t.pass();
//         } else {
//             t.context.n('Too long');
//             t.fail();
//         }
//     }, 3000);
//     await t.context.p;
// }

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

export function appXCoordinate(appTitleNumber: number) {
    return (appTitleNumber * 275);
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
        const defaultLeft = appXCoordinate(numAppsToCreate);
        const appOptions = {...OPTIONS_BASE, uuid: id, name: id, defaultTop: 100, defaultLeft};
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