import test from 'ava';
import {teardown} from '../../teardown';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, closeAllPreviews, createCloseAndRestoreLayout} from '../utils/workspacesUtils';
import {createAppsArray} from '../utils/AppInitializer';

const tenManifestApplications = createAppsArray(
            10, 0, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false', defaultTop: 100});

const thirtyManifestApplications = createAppsArray(
            20, 0, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false', defaultTop: 100});

const tenProgrammaticApplications = createAppsArray(
            10, 0, {defaultTop: 100});

const thirtyProgrammaticApplications = createAppsArray(
            20, 0, {defaultTop: 100});

test.afterEach.always(async (t) => {
    await closeAllPreviews(t);
    await teardown(t);
});

// This test should be solved by RUN-5040 and RVM-814. Current workaround is sequential launching in restore
testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `SaveAndRestore Mass App Creation - Restoring ${testOptions.apps.length} applications created ${testOptions.apps[0].createType === 'manifest' ? 'from a manifest' : 'programmatically'}`,
    [{apps: tenManifestApplications}, {apps: thirtyManifestApplications}, {apps: tenProgrammaticApplications}, {apps: thirtyProgrammaticApplications}],
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);

        for (const applicationInfo of t.context.testAppData) {
            await assertWindowRestored(t, applicationInfo.uuid, applicationInfo.uuid);
        }
    }));
