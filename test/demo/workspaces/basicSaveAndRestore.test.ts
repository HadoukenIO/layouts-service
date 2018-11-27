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
    defaultHeight: 250,
    defaultWidth: 250
};

export const APP_INITIALIZER_BASE = {
    appOptions: OPTIONS_BASE,
    createType: 'programmatic',
    childWindows: []
};

let appNumber = 0;

export function appXCoordinate(appNumber: number) {
    return (appNumber * 275);
}

function createTest(numApps: number, children: number): {apps: AppInitializerInfo[]} {
    const testArray = [];

    while (numApps > 0) {
        // Set the app information
        appNumber++;
        const id = 'test-app' + appNumber;

        // Set the child window information
        const childWindows = [];
        let childNumber = children;
        while (childNumber > 0) {
            childWindows.push({name: `test${appNumber}-child${childNumber}`});
            childNumber--;
        }

        // Save the app information
        const defaultLeft = appXCoordinate(numApps);
        const appOptions = {...OPTIONS_BASE, uuid: id, name: id, defaultTop: 100, defaultLeft};
        testArray.push({...APP_INITIALIZER_BASE, appOptions, childWindows});

        numApps--;
    }

    return {apps: testArray as AppInitializerInfo[]};
}

const basicTestOptionsArray: BasicSaveRestoreTestOptions[] = [];

const appNumbers = [1, 2];
const childNumbers = [0, 1, 2, 3];

appNumbers.forEach(appNumber => {
    childNumbers.forEach(childNumber => {
        const test = createTest(appNumber, childNumber);
        basicTestOptionsArray.push(test);
    });
});

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