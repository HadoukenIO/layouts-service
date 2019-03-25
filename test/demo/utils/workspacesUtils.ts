import {Application} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';
import * as assert from 'power-assert';

import {SERVICE_IDENTITY, WorkspaceAPI} from '../../../src/client/internal';
import {generate, restore, Workspace} from '../../../src/client/workspaces';
import {getConnection} from '../../provider/utils/connect';
import {BasicSaveRestoreTestOptions} from '../workspaces/basicSaveAndRestore.inttest';
import {SnapSaveRestoreTestOptions} from '../workspaces/snapSaveAndRestore.inttest';
import {TabSaveRestoreTestOptions} from '../workspaces/tabSaveAndRestore.inttest';

import {createAppsArray, createWindowGroupings, TestAppData} from './AppInitializer';
import {AppContext} from './createAppTest';

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

export async function assertWindowRestored(uuid: string, name: string) {
    assert.strictEqual(await isWindowActive(uuid, name), true, `Window ${uuid}:${name} was not restored`);
}

export async function assertWindowNotRestored(uuid: string, name: string) {
    assert.strictEqual(await isWindowActive(uuid, name), false, `Window ${uuid}:${name} was restored when it should not have been`);
}

function assertIsLayoutObject(layout: Workspace) {
    assert.strictEqual(layout.type, 'workspace', 'Layout object has an incorrect type!');
}

async function getTestApps(): Promise<Application[]> {
    return Promise.all((await fin.System.getAllApplications())
                           .filter((app: ApplicationInfo) => {
                               const uuid = app.uuid;
                               return uuid !== 'layouts-service' && uuid !== 'testApp';
                           })
                           .map((app: ApplicationInfo) => {
                               return fin.Application.wrapSync({uuid: app.uuid});
                           }));
}

export async function createCloseAndRestoreLayout(context?: AppContext): Promise<Workspace> {
    const workspace = await generate();

    assertIsLayoutObject(workspace);

    let apps: Application[];
    if (context !== undefined) {
        apps = context.testAppData.map(appData => appData.app);
    } else {
        apps = await getTestApps();
    }

    await Promise.all(apps.map(app => app.close()));
    await Promise.all(apps.map(async (app) => {
        if (await app.isRunning()) {
            assert.fail(`Application ${app.identity.uuid} is running, but it should have been closed.`);
        }
    }));

    await restore(workspace);

    return workspace;
}

export interface TestCreationOptions {
    url?: string;
    manifest?: boolean;
    autoShow?: boolean;
}

export function createBasicSaveAndRestoreTest(
    numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions): BasicSaveRestoreTestOptions {
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren, testOptions);

    return {apps: appsArray};
}

export function createSnapTests(numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions): SnapSaveRestoreTestOptions[] {
    const windowGroupings = createWindowGroupings(numAppsToCreate, numberOfChildren);
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren, testOptions);

    return windowGroupings.map(windowGrouping => {
        return {apps: appsArray, snapWindowGrouping: windowGrouping};
    });
}

export function createTabTests(numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions): TabSaveRestoreTestOptions[] {
    const windowGroupings = createWindowGroupings(numAppsToCreate, numberOfChildren);
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren, testOptions);

    return windowGroupings.map(windowGrouping => {
        return {apps: appsArray, tabWindowGrouping: windowGrouping};
    });
}

export async function closeAllPreviews(): Promise<void> {
    const serviceApp = fin.Application.wrapSync(SERVICE_IDENTITY);
    const children = await serviceApp.getChildWindows();
    const actions: Promise<void>[] = [];
    for (const child of children) {
        if (child.identity.name!.startsWith('Placeholder-')) {
            assert.fail('Placeholder still exists after save/restore: ' + child.identity.name);
            actions.push(child.close());
        }
    }
    return Promise.all(actions).then(() => {});
}