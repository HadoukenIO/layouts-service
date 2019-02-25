import test from 'ava';

import {assertGrouped, assertTabbed} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {teardown} from '../../teardown';
import {createAppsArray} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {assertWindowRestored, closeAllPreviews, createCloseAndRestoreLayout} from '../utils/workspacesUtils';

const registeredProgrammaticApp = createAppsArray(1, 0);
const deregisteredProgrammaticParentandChild =
    createAppsArray(1, 2, {manifest: false, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true'});
const combinedProgrammaticApps = registeredProgrammaticApp.concat(deregisteredProgrammaticParentandChild);

const registeredManifestApp = createAppsArray(1, 0, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false'});
const deregisteredManifestParentandChild =
    createAppsArray(1, 2, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=true'});
const combinedManifestApps = registeredManifestApp.concat(deregisteredManifestParentandChild);

const windowGrouping = [[3, 1], [0, 2]];

test.afterEach.always(async (t) => {
    await closeAllPreviews(t);
    await teardown(t);
});

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `Tab SaveAndRestore - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - Formerly tabbed window resize`,
    [{apps: combinedProgrammaticApps, tabWindowGrouping: windowGrouping}, {apps: combinedManifestApps, tabWindowGrouping: windowGrouping}],
    createAppTest(async (t, applicationData: CreateAppData) => {
        if (applicationData.tabWindowGrouping) {
            const group = applicationData.tabWindowGrouping[1];
            const win1 = t.context.windows[group[0]];
            const win2 = t.context.windows[group[1]];

            await assertTabbed(win1, win2, t);
            await assertGrouped(t, win1, win2);
            const tabbedBounds = await win1.getBounds();

            await createCloseAndRestoreLayout(t);
            await delay(2000);

            await assertWindowRestored(t, win1.identity.uuid, win1.identity.name!);

            const untabbedBounds = await win1.getBounds();

            if (untabbedBounds.top === tabbedBounds.top || untabbedBounds.height === tabbedBounds.height) {
                t.fail(`Application ${win1.identity.uuid} was restored at: ${tabbedBounds.top} x ${tabbedBounds.left} instead of ${untabbedBounds.top} x ${
                    untabbedBounds.left}`);
            } else {
                t.pass();
            }
        } else {
            t.fail('Improper test options passed in. Test options must include tabWindowGroupings in order to test');
        }
    }));
