import {TestContext} from 'ava';
import {Window} from 'hadouken-js-adapter';
import {NormalizedBounds, getBounds} from './getBounds';
import {getGroupedWindows} from '../../demo/utils/snapServiceUtils';
import {getTabGroupID} from '../../demo/utils/tabServiceUtils';

export async function assertGrouped(win1: Window, win2: Window, t: TestContext) {
    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

    // Both windows are in the same SnapGroup
    const [snapGroup1, snapGroup2] = [await getGroupedWindows(win1.identity), await getGroupedWindows(win2.identity)];
    t.deepEqual(snapGroup1, snapGroup2);
}

export async function assertNotGrouped(win: Window, t: TestContext) {
    // Window is not native grouped
    const group = await win.getGroup();
    t.is(group.length, 0);

    // Window is alone in it's SnapGroup
    const snapGroup = await getGroupedWindows(win.identity);
    t.is(snapGroup.length, 1);
}

export function assertMoved(bounds1: NormalizedBounds, bounds2: NormalizedBounds, t: TestContext) {
    t.notDeepEqual(bounds1, bounds2);
}

export function assertNotMoved(bounds1: NormalizedBounds, bounds2: NormalizedBounds, t: TestContext) {
    t.deepEqual(bounds1, bounds2);
}

export async function assertTabbed(win1: Window, win2: Window, t: TestContext): Promise<void> {
    // Get the tabGroup UUID for each window
    const [tabGroupID1, tabGroupID2] = [await getTabGroupID(win1.identity), await getTabGroupID(win2.identity)];

    // Assert that the windows have the same UUID and that is is not null
    t.is(tabGroupID1, tabGroupID2);
    t.not(tabGroupID1, null);

    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

    // Both windows have the same bounds
    const [bounds1, bounds2] = [await getBounds(win1), await getBounds(win2)];
    t.deepEqual(bounds1, bounds2, 'Tabbed windows do not have the same bounds');
}

export async function assertNotTabbed(win: Window, t: TestContext): Promise<void> {

    // Get the tabGroup ID for the window
    const tabGroupID = await getTabGroupID(win.identity);
    // Untabbed windows will return null
    t.is(tabGroupID, null);
}
