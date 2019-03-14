/*import {Context, GenericTestContext, Test, TestContext} from 'ava';
import {Application} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';

import {SERVICE_IDENTITY, WorkspaceAPI} from '../../../src/client/internal';
import {Workspace} from '../../../src/client/workspaces';
import {getConnection} from '../../provider/utils/connect';
import {BasicSaveRestoreTestOptions} from '../workspaces/basicSaveAndRestore.test';
import {SnapSaveRestoreTestOptions} from '../workspaces/snapSaveAndRestore.test';
import {TabSaveRestoreTestOptions} from '../workspaces/tabSaveAndRestore.test';

import {createAppsArray, createWindowGroupings, TestAppData} from './AppInitializer';
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

export async function assertWindowRestored(t: TestContext, uuid: string, name: string) {
    const active = await isWindowActive(uuid, name);
    active ? t.pass() : t.fail(`Window ${uuid}:${name} was not restored`);
}

export async function assertWindowNotRestored(t: TestContext, uuid: string, name: string) {
    const active = await isWindowActive(uuid, name);
    active ? t.fail(`Window ${uuid}:${name} was restored when it should not have been`) : t.pass();
}

function assertIsLayoutObject(t: TestContext, layout: Workspace) {
    layout.type === 'workspace' ? t.pass() : t.fail('Layout object has an incorrect type!');
}

async function assertAllAppsClosed(t: SaveRestoreTestContext) {
    t.context.testAppData.forEach(async (appData: TestAppData) => {
        const appRunning = await appData.app.isRunning();
        if (appRunning) {
            t.fail(`Application ${appData.uuid} is running, but it should have been closed.`);
            return;
        }
    });
}

function isSaveRestoreContext(t: TestContext|SaveRestoreTestContext): t is SaveRestoreTestContext {
    const c: SaveRestoreTestContext = t as SaveRestoreTestContext;
    return !!(c.context && c.context.testAppData);
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

export async function createCloseAndRestoreLayout(t: TestContext|SaveRestoreTestContext): Promise<Workspace> {
    const workspace = await sendServiceMessage(WorkspaceAPI.GENERATE_LAYOUT, undefined) as Workspace;

    assertIsLayoutObject(t, workspace);
    if (isSaveRestoreContext(t)) {
        // Close all apps that were created as part of restore
        await Promise.all(t.context.testAppData.map(async (appData: TestAppData) => await appData.app.close(true)));
        await assertAllAppsClosed(t);
    } else {
        // Close all apps
        await Promise.all((await getTestApps()).map(app => app.close()));
        await getTestApps().then(async (apps: Application[]) => {
            await Promise.all(apps.map(async (app) => {
                if (await app.isRunning()) {
                    t.fail(`Application ${app.identity.uuid} is running, but it should have been closed.`);
                }
            }));
        });
    }
    await sendServiceMessage(WorkspaceAPI.RESTORE_LAYOUT, workspace);

    return workspace;
}*/

export interface TestCreationOptions {
    url?: string;
    manifest?: boolean;
    autoShow?: boolean;
}
/*
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

export async function closeAllPreviews(t: TestContext): Promise<void> {
    const serviceApp = fin.Application.wrapSync(SERVICE_IDENTITY);
    const children = await serviceApp.getChildWindows();
    const actions: Promise<void>[] = [];
    for (const child of children) {
        if (child.identity.name!.startsWith('Placeholder-')) {
            t.fail('Placeholder still exists after save/restore: ' + child.identity.name);
            actions.push(child.close());
        }
    }
    return Promise.all(actions).then(() => {});
}*/