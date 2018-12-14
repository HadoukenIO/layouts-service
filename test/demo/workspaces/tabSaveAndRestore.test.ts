import test from 'ava';

import {assertGrouped, assertTabbed} from '../../provider/utils/assertions';
import {AppInitializerParams, WindowGrouping} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {closeAllPreviews, createCloseAndRestoreLayout, createTabTests} from '../utils/workspacesUtils';

export interface TabSaveRestoreTestOptions {
    apps: AppInitializerParams[];
    tabWindowGrouping: WindowGrouping;
}

const tabTestOptionsArray: TabSaveRestoreTestOptions[] = [];

// Currently only supports this number of windows max (4). Need to update createWindowGroupings in AppInitializer if you want more groups.
const appNumbers = [1, 2];
const childNumbers = [0, 1];

appNumbers.forEach(appNumber => {
    childNumbers.forEach(childNumber => {
        if (appNumber === 1 && childNumber === 0) {
            return;
        }

        const programmaticTabTests = createTabTests(appNumber, childNumber);
        for (const programmaticTabTest of programmaticTabTests) {
            tabTestOptionsArray.push(programmaticTabTest);
        }

        const manifestTabTests =
            createTabTests(appNumber, childNumber, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false'});
        for (const manifestTabTest of manifestTabTests) {
            tabTestOptionsArray.push(manifestTabTest);
        }
    });
});

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string => `Tab SaveAndRestore - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
        testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    tabTestOptionsArray,
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);

        for (const group of applicationData.tabWindowGrouping!) {
            const win1 = t.context.windows[group[0]];
            const win2 = t.context.windows[group[1]];

            await assertTabbed(win1, win2, t);
            await assertGrouped(t, win1, win2);
        }
    }));


test.afterEach.always(closeAllPreviews);