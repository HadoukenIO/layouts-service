import {delay} from '../../provider/utils/delay';
import {AppInitializerParams} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowNotRestored, createBasicSaveAndRestoreTest, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

export interface BasicSaveRestoreTestOptions {
    apps: AppInitializerParams[];
}

const basicTestOptionsArray: BasicSaveRestoreTestOptions[] = [];

const numberOfApps = [1, 2];
const numberOfChildren = [0, 1, 2, 3];

numberOfApps.forEach(appNumber => {
    numberOfChildren.forEach(childNumber => {
        const programmaticDeregisteredTest = createBasicSaveAndRestoreTest(
            appNumber, childNumber, {manifest: false, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true'});
        basicTestOptionsArray.push(programmaticDeregisteredTest);

        const manifestDeregisteredTest = createBasicSaveAndRestoreTest(
            appNumber, childNumber, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true'});
        basicTestOptionsArray.push(manifestDeregisteredTest);
    });
});

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `Basic Deregistered SaveAndRestore - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
            testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    basicTestOptionsArray,
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);
        await delay(2000);

        for (const applicationInfo of t.context.testAppData) {
            await assertWindowNotRestored(t, applicationInfo.uuid, applicationInfo.uuid);
            for (const applicationChild of applicationInfo.children) {
                await assertWindowNotRestored(t, applicationInfo.uuid, applicationChild.identity.name!);
            }
        }
    }));