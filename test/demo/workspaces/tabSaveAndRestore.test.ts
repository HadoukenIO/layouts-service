import {assertGrouped, assertTabbed} from '../../provider/utils/assertions';
import {getWindow} from '../../provider/utils/getWindow';
import {AppInitializerInfo} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {createCloseAndRestoreLayout, createTabTests} from '../utils/workspacesUtils';

export interface TabSaveRestoreTestOptions {
    apps: AppInitializerInfo[];
    tabWindowGrouping: number[][];
}

const basicTestOptionsArray: TabSaveRestoreTestOptions[] = [];

// Currently only supports this number of windows max (4). Need to update createWindowGroupings in workspacesUtils if you want more groups.
const appNumbers = [1, 2];
const childNumbers = [0, 1];

appNumbers.forEach(appNumber => {
    childNumbers.forEach(childNumber => {
        if (appNumber === 1 && childNumber === 0) {
            return;
        }
        const tests = createTabTests(appNumber, childNumber);
        for (const test of tests) {
            basicTestOptionsArray.push(test);
        }
    });
});

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string =>
        `Tab SaveAndRestore - ${testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    basicTestOptionsArray,
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);

        for (const group of applicationData.tabWindowGrouping!) {
            let win1 = t.context.windows[group[0]];
            let win2 = t.context.windows[group[1]];

            win1 = await getWindow({uuid: win1.identity.uuid, name: win1.identity.name});
            win2 = await getWindow({uuid: win2.identity.uuid, name: win2.identity.name});

            await assertTabbed(win1, win2, t);
            await assertGrouped(t, win1, win2);
        }
    }));