import {Context, GenericTestContext, Test, TestContext} from 'ava';

import {getConnection} from '../../provider/utils/connect';

import {AppInitializerParams, createAppsArray, createWindowGroupings, TestAppData, WindowGrouping} from './AppInitializer';
import {AppContext} from './createAppTest';
import {sendServiceMessage} from './serviceUtils';

type SaveRestoreTestContext = GenericTestContext<Context<AppContext>>;

async function isWindowActive(uuid: string, name: string) {
    const fin = await getConnection();
    const allWindows = await fin.System.getAllWindows();

    return allWindows.some(win => {
        if (win.uuid !== uuid) {
            return false;
        } else if (uuid === name) {
            return true;
        } else {
            return win.childWindows.some(childWin => childWin.name === name);
        }
    });
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
    await Promise.all(t.context.testAppData.map(async (appData: TestAppData) => await appData.app.close(true)));
    await sendServiceMessage('restoreLayout', generatedLayout);
}

export function createBasicSaveAndRestoreTest(numAppsToCreate: number, numberOfChildren: number): {apps: AppInitializerParams[]} {
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren);

    return {apps: appsArray as AppInitializerParams[]};
}

export function createSnapTests(numApps: number, children: number): {apps: AppInitializerParams[], snapWindowGrouping: WindowGrouping}[] {
    const windowGroupings = createWindowGroupings(numApps, children);
    const appsArray = createAppsArray(numApps, children);

    return windowGroupings.map(windowGrouping => {
        return {apps: appsArray as AppInitializerParams[], snapWindowGrouping: windowGrouping};
    });
}

export function createTabTests(numApps: number, children: number): {apps: AppInitializerParams[], tabWindowGrouping: WindowGrouping}[] {
    const windowGroupings = createWindowGroupings(numApps, children);
    const appsArray = createAppsArray(numApps, children);

    return windowGroupings.map(windowGrouping => {
        return {apps: appsArray as AppInitializerParams[], tabWindowGrouping: windowGrouping};
    });
}