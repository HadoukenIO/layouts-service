import {assertGrouped, assertNotGrouped, assertNotGroupedTogether, assertNotMoved, assertTabbed} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';

interface MaximizeTabGroupsInstance extends CreateWindowData {
    windowCount: 3|4;
}


testParameterized(
    `Docked tabGroups undock when maximized`,
    [
        {windowCount: 3, frame: false},
        {windowCount: 4, frame: false},
    ],
    createWindowTest(async(t, options: MaximizeTabGroupsInstance): Promise<void> => {
        const {windows} = t.context;
        const layoutsClient = await layoutsClientPromise;

        await layoutsClient.tabbing.createTabGroup([windows[0].identity, windows[1].identity]);
        await assertTabbed(windows[0], windows[1], t);

        // If 4 windows, the other two will be tabbed before snapping
        if (options.windowCount > 3) {
            await layoutsClient.tabbing.createTabGroup([windows[2].identity, windows[3].identity]);
            await assertTabbed(windows[2], windows[3], t);
        }

        await dragSideToSide(windows[2], 'left', windows[0], 'right');
        await assertGrouped(t, ...windows);

        const boundsBefore = await getBounds(windows[2]);
        await layoutsClient.tabbing.maximizeTabGroup(windows[0].identity);

        await assertTabbed(windows[0], windows[1], t);

        // Snapped window has not moved/resized when tabgroup maximized.
        const boundsAfter = await getBounds(windows[2]);
        await assertNotMoved(boundsBefore, boundsAfter, t);

        if (options.windowCount > 3) {
            await assertTabbed(windows[2], windows[3], t);
            await assertNotGroupedTogether(t, windows[0], windows[2]);
        } else {
            await assertNotGrouped(windows[2], t);
        }
    }));