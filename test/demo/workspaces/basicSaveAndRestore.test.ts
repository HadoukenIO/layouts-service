import {delay} from '../../provider/utils/delay';
import {AppInitializerInfo} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

export interface BasicSaveRestoreTestOptions {
    apps: AppInitializerInfo[];
}

export const OPTIONS_BASE = {
    uuid: 'BASE',
    url: 'http://localhost:1337/test/registeredApp.html',
    name: 'BASE',
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultHeight: 300,
    defaultWidth: 300
};

export const APP_INITIALIZER_BASE = {
    appOptions: OPTIONS_BASE,
    createType: 'programmatic',
    childWindows: []
};

let appNumber = 0;

export function randomCoordinate() {
    return Math.floor(Math.random() * (700 - 100 + 1)) + 100;
}

function createNewAppOptions(children?: number) {
    appNumber++;
    const id = 'test-app' + appNumber;
    let childNumber = children !== undefined && children > 0 ? children : 0;
    const childWindows = [];
    while (childNumber > 0) {
        childWindows.push({name: `test${appNumber}-child${childNumber}`});
        childNumber--;
    }
    return {
        ...APP_INITIALIZER_BASE,
        appOptions: {...OPTIONS_BASE, uuid: id, name: id, defaultTop: randomCoordinate(), defaultLeft: randomCoordinate()},
        childWindows
    };
}

const basicTestOptionsArray: BasicSaveRestoreTestOptions[] = [];

function addTestToAppsArray(testOptions: AppInitializerInfo[]) {
    basicTestOptionsArray.push({apps: testOptions});
}

addTestToAppsArray([createNewAppOptions() as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(1) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(2) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(3) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions() as AppInitializerInfo, createNewAppOptions() as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(1) as AppInitializerInfo, createNewAppOptions(1) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(2) as AppInitializerInfo, createNewAppOptions(2) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(3) as AppInitializerInfo, createNewAppOptions(3) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions() as AppInitializerInfo, createNewAppOptions() as AppInitializerInfo, createNewAppOptions() as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(1) as AppInitializerInfo, createNewAppOptions(1) as AppInitializerInfo, createNewAppOptions(1) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(2) as AppInitializerInfo, createNewAppOptions(2) as AppInitializerInfo, createNewAppOptions(2) as AppInitializerInfo]);
addTestToAppsArray([createNewAppOptions(3) as AppInitializerInfo, createNewAppOptions(3) as AppInitializerInfo, createNewAppOptions(3) as AppInitializerInfo]);

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string => `Basic SaveAndRestore - ${testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Children`,
    basicTestOptionsArray,
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);

        for (const applicationInfo of t.context.testAppData) {
            await assertWindowRestored(t, applicationInfo.uuid, applicationInfo.uuid);
            for (const applicationChild of applicationInfo.children) {
                await assertWindowRestored(t, applicationInfo.uuid, applicationChild.identity.name!);
            }
        }
    }));