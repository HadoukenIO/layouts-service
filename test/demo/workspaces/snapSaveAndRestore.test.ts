import {test} from 'ava';

import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {dragWindowTo} from '../../provider/utils/dragWindowTo';
import {teardown} from '../../teardown';
import {WindowGrouping} from '../utils/AppInitializer';
import {AppContext, CreateAppData, createAppTest} from '../utils/createAppTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {closeAllPreviews, createCloseAndRestoreLayout, createSnapTests} from '../utils/workspacesUtils';

import {BasicSaveRestoreTestOptions} from './basicSaveAndRestore.test';

export interface SnapSaveRestoreTestOptions extends BasicSaveRestoreTestOptions {
    snapWindowGrouping: WindowGrouping;
}

const snapTestOptionsArray: SnapSaveRestoreTestOptions[] = [];

// Currently only supports this number of windows max (4). Need to update createWindowGroupings in AppInitializer if you want more groups.
const appNumbers = [1, 2];
const childNumbers = [0, 1];

appNumbers.forEach(appNumber => {
    childNumbers.forEach(childNumber => {
        if (appNumber === 1 && childNumber === 0) {
            return;
        }

        const programmaticSnapTests = createSnapTests(appNumber, childNumber);
        for (const programmaticSnapTest of programmaticSnapTests) {
            snapTestOptionsArray.push(programmaticSnapTest);
        }

        const manifestSnapTests =
            createSnapTests(appNumber, childNumber, {manifest: true, url: 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false'});
        for (const manifestSnapTest of manifestSnapTests) {
            snapTestOptionsArray.push(manifestSnapTest);
        }
    });
});

test.afterEach.always(teardown);

testParameterized<CreateAppData, AppContext>(
    (testOptions: CreateAppData): string => `Snap SaveAndRestore - ${testOptions.apps[0].createType === 'manifest' ? 'Manifest' : 'Programmatic'} - ${
        testOptions.apps.length} App(s) - ${testOptions.apps[0].childWindows.length} Child(ren) Each`,
    snapTestOptionsArray,
    createAppTest(async (t, applicationData: CreateAppData) => {
        await createCloseAndRestoreLayout(t);

        for (let index = 0; index < applicationData.snapWindowGrouping!.length; index++) {
            const grouping = applicationData.snapWindowGrouping![index];

            const win1 = t.context.windows[grouping.group[0]];
            const win2 = t.context.windows[grouping.group[1]];

            await dragWindowTo(win1, 500, ((260 * index) + 100));
            await assertAdjacent(t, win1, win2);
            await assertGrouped(t, win1, win2);
        }
    })
);


test.afterEach.always(closeAllPreviews);
