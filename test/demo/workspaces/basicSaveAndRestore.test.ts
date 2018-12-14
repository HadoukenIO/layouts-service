import test from 'ava';

import {AppInitializerParams} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, closeAllPreviews, createBasicSaveAndRestoreTest, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

export interface BasicSaveRestoreTestOptions {
    apps: AppInitializerParams[];
}

const basicTestOptionsArray: BasicSaveRestoreTestOptions[] = [];

const numberOfApps = [1, 2];
const numberOfChildren = [0, 1, 2, 3];

numberOfApps.forEach(appNumber => {
    numberOfChildren.forEach(childNumber => {
        const programmaticSaveAndRestoreTest = createBasicSaveAndRestoreTest(appNumber, childNumber);
        basicTestOptionsArray.push(programmaticSaveAndRestoreTest);

        const manifestSaveAndRestoreTest = createBasicSaveAndRestoreTest(
            appNumber, childNumber, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false'});
        basicTestOptionsArray.push(manifestSaveAndRestoreTest);
    });
});

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string => `Basic SaveAndRestore - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
        testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
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


test.afterEach.always(closeAllPreviews);