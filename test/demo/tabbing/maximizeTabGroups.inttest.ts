import {assertGrouped, assertNotGrouped, assertNotGroupedTogether, assertNotMoved, assertPairTabbed} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/bounds';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {itParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';

interface MaximizeTabGroupsInstance extends CreateWindowData {
    windowCount: 3|4;
}

afterEach(teardown);

itParameterized(
    'When a tabgroup is docked with another window, maximizing the tabgroup undocks the tabgroup',
    (testOptions) => `windowCount: ${testOptions.windowCount}`,
    [
        {windowCount: 3, frame: false},
        {windowCount: 4, frame: false}
    ],
    createWindowTest(async(context, testOptions: MaximizeTabGroupsInstance): Promise<void> => {
        const {windows} = context;
        const layoutsClient = await layoutsClientPromise;

        await layoutsClient.tabbing.createTabGroup([windows[0].identity, windows[1].identity]);
        await assertPairTabbed(windows[0], windows[1]);

        // If 4 windows, the other two will be tabbed before snapping
        if (testOptions.windowCount > 3) {
            await layoutsClient.tabbing.createTabGroup([windows[2].identity, windows[3].identity]);
            await assertPairTabbed(windows[2], windows[3]);
        }

        await dragSideToSide(windows[2], 'left', windows[0], 'right');
        await assertGrouped(...windows);

        const boundsBefore = await getBounds(windows[2]);
        await layoutsClient.tabbing.maximizeTabGroup(windows[0].identity);

        await assertPairTabbed(windows[0], windows[1]);

        // Snapped window has not moved/resized when tabgroup maximized.
        const boundsAfter = await getBounds(windows[2]);
        await assertNotMoved(boundsBefore, boundsAfter);

        if (testOptions.windowCount > 3) {
            await assertPairTabbed(windows[2], windows[3]);
            await assertNotGroupedTogether(windows[0], windows[2]);
        } else {
            await assertNotGrouped(windows[2]);
        }
    })
);
