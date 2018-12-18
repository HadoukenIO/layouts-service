import {AppInitializerParams} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, createBasicSaveAndRestoreTest, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

export interface BasicSaveRestoreTestOptions {
    apps: AppInitializerParams[];
}

const basicTestOptionsArray: BasicSaveRestoreTestOptions[] = [];

const numberOfApps = [1, 2];
const numberOfChildren = [0, 1, 2, 3];

numberOfApps.forEach(appNumber => {
    numberOfChildren.forEach(childNumber => {
        const test = createBasicSaveAndRestoreTest(appNumber, childNumber);
        basicTestOptionsArray.push(test);
    });
});

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `Basic SaveAndRestore - ${testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
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