import {delay} from '../../provider/utils/delay';
import {teardown} from '../../teardown';
import {CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowNotRestored, closeAllPreviews, createBasicSaveAndRestoreTest, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

import {BasicSaveRestoreTestOptions} from './basicSaveAndRestore.test';

const deregisteredTestOptionsArray: BasicSaveRestoreTestOptions[] = [];

const numberOfApps = [1, 2];
const numberOfChildren = [0, 1, 2];

numberOfApps.forEach(appNumber => {
    numberOfChildren.forEach(childNumber => {
        const programmaticDeregisteredTest = createBasicSaveAndRestoreTest(
            appNumber, childNumber, {manifest: false, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true'});
        deregisteredTestOptionsArray.push(programmaticDeregisteredTest);

        const manifestDeregisteredTest = createBasicSaveAndRestoreTest(
            appNumber, childNumber, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true'});
        deregisteredTestOptionsArray.push(manifestDeregisteredTest);
    });
});

afterEach(teardown);

testParameterized<CreateAppData>(
    (testOptions: CreateAppData): string =>
        `Basic Deregistered SaveAndRestore - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
            testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    deregisteredTestOptionsArray,
    createAppTest(async (context, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(context);
        await delay(2000);

        for (const applicationInfo of context.testAppData) {
            await assertWindowNotRestored(applicationInfo.uuid, applicationInfo.uuid);
            for (const applicationChild of applicationInfo.children) {
                await assertWindowNotRestored(applicationInfo.uuid, applicationChild.identity.name!);
            }
        }
    }));


afterEach(closeAllPreviews);