import {test} from 'ava';
import {WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';
import {teardown} from '../../teardown';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, closeAllPreviews, createBasicSaveAndRestoreTest, createCloseAndRestoreLayout} from '../utils/workspacesUtils';
import {BasicSaveRestoreTestOptions} from './basicSaveAndRestore.test';

const hiddenParentTestArray: BasicSaveRestoreTestOptions[] = [];

const numberOfApps = [1, 2];
const numberOfChildren = [1, 2];

numberOfApps.forEach(appNumber => {
    numberOfChildren.forEach(childNumber => {
        const programmaticHiddenTestOptions = {autoShow: false};
        const programmaticHiddenParentTest = createBasicSaveAndRestoreTest(appNumber, childNumber, programmaticHiddenTestOptions);
        hiddenParentTestArray.push(programmaticHiddenParentTest);

        const manifestHiddenTestOptions = {autoShow: false, manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false'};
        const manifestHiddenParentTest = createBasicSaveAndRestoreTest(appNumber, childNumber, manifestHiddenTestOptions);
        hiddenParentTestArray.push(manifestHiddenParentTest);
    });
});

test.afterEach.always(teardown);

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `Flash Check for SaveAndRestore - Parent Windows shouldn't show - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
            testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    hiddenParentTestArray,
    createAppTest(async (t, applicationData: CreateAppData) => {
        const failIfShown = (e: WindowEvent<'window', 'shown'>) => {
            t.fail(`Parent Window ${e.uuid} showed when it shouldn't have.`);
        };

        for (const applicationInfo of t.context.testAppData) {
            await applicationInfo.app.addListener('shown', failIfShown);
        }

        await createCloseAndRestoreLayout(t);

        for (const applicationInfo of t.context.testAppData) {
            await assertWindowRestored(t, applicationInfo.uuid, applicationInfo.uuid);
            for (const applicationChild of applicationInfo.children) {
                await assertWindowRestored(t, applicationInfo.uuid, applicationChild.identity.name!);
            }
        }
    }));


test.afterEach.always(closeAllPreviews);