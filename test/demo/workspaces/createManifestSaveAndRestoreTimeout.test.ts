import test from 'ava';
import {teardown} from '../../teardown';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, closeAllPreviews, createCloseAndRestoreLayout, createBasicSaveAndRestoreTest} from '../utils/workspacesUtils';

const manifestApplications = createBasicSaveAndRestoreTest(
            10, 0, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false'});

test.afterEach.always(async (t) => {
    await closeAllPreviews(t);
    await teardown(t);
});

// This test should be solved by RUN-5040 and RVM-814. Current workaround is sequential launching in restore
testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `CreateFromManifest SaveAndRestore - Restoring 10 applications created from a manifest`,
    [manifestApplications],
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);

        for (const applicationInfo of t.context.testAppData) {
            await assertWindowRestored(t, applicationInfo.uuid, applicationInfo.uuid);
        }
    }));
