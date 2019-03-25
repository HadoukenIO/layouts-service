import {WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';
import * as assert from 'power-assert';

import {teardown} from '../../teardown';
import {CreateAppData, createAppTest} from '../utils/createAppTest';
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

afterEach(teardown);

testParameterized<CreateAppData>(
    (testOptions: CreateAppData): string =>
        `Flash Check for SaveAndRestore - Parent Windows shouldn't show - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
            testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    hiddenParentTestArray,
    createAppTest(async (context, applicationData: CreateAppData) => {
        // Set up the callback to fail the test if the parent window shows.
        const failIfShown = (e: WindowEvent<'window', 'shown'>) => {
            assert.fail(`Parent Window ${e.uuid} showed when it shouldn't have.`);
        };

        for (const applicationInfo of context.testAppData) {
            await applicationInfo.app.addListener('shown', failIfShown);
        }

        await createCloseAndRestoreLayout(context);

        for (const applicationInfo of context.testAppData) {
            await assertWindowRestored(applicationInfo.uuid, applicationInfo.uuid);
            for (const applicationChild of applicationInfo.children) {
                await assertWindowRestored(applicationInfo.uuid, applicationChild.identity.name!);
            }
        }
    }));


afterEach(closeAllPreviews);