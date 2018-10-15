import {TestContext} from 'ava';
import deepEqual from 'fast-deep-equal';
import {Window} from 'hadouken-js-adapter';

import {promiseMap} from '../../../src/provider/snapanddock/utils/async';
import {getGroupedWindows, getSnapGroupID} from '../../demo/utils/snapServiceUtils';
import {getTabGroupID} from '../../demo/utils/tabServiceUtils';

import {getBounds, NormalizedBounds} from './getBounds';
import {Win} from './getWindow';
import {isAdjacentTo} from './isAdjacentTo';
import {Side} from './SideUtils';

/**
 * Assert that the given windows are **all** part of the same snap group.
 */
export async function assertGrouped(t: TestContext, ...windows: Window[]) {
    if (windows.length < 2) {
        throw new Error('Too few windows passed to assertGrouped. Requires at least two windows');
    }
    // Get the native openfin groups for each window
    const groups = await promiseMap(windows, async win => win.getGroup());
    // Check that all of the windows have the same native group
    for (let i = 0; i < groups.length - 1; i++) {
        // If the groups are not the same length skip all other checks and fail immediately.
        if (groups[i].length !== groups[0].length) {
            t.fail(`Window ${i} has a different native group to window 0`);
            break;
        }
        let result = true;
        // Check window-by-window that the groups are the same
        for (let j = 0; j < groups[i].length; j++) {
            result = result && deepEqual(groups[i][j].identity, groups[0][j].identity);
        }
        t.true(result, `Window ${i} has a different native group to window 0`);
    }

    // Both windows are in the same SnapGroup
    const snapGroupIDs = await promiseMap(windows, async win => getSnapGroupID(win.identity));
    for (let i = 0; i < snapGroupIDs.length - 1; i++) {
        t.is(snapGroupIDs[i], snapGroupIDs[0], `Window ${i} has a different snapGroup to window 0`);
    }
}

/**
 * Assert that a given window is not part of a SnapGroup of native window group.
 */
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

/**
 * Assert that the given windows are part of the same TabGroup.
 */
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

/**
 * Assert that a given window is not part of a TabGroup.
 */
export async function assertNotTabbed(win: Window, t: TestContext): Promise<void> {
    // Get the tabGroup ID for the window
    const tabGroupID = await getTabGroupID(win.identity);
    // Untabbed windows will return null
    t.is(tabGroupID, null);
}

/**
 * Assert that two given windows are adjacent. If side is not specified, will check on all sides
 * and pass if any are true.
 */
export async function assertAdjacent(t: TestContext, win1: Win, win2: Win, side?: Side): Promise<void> {
    t.true(await isAdjacentTo(win1, win2, side));
}

/**
 * Will assert that the four windows given to it are adjacent and form a square.
 * Windows are numbered as in the following pattern:
 *   0 1
 *   2 3
 */
export async function assertSquare(t: TestContext, ...windows: Win[]) {
    if (windows.length !== 4) {
        throw new Error(`assertSquare called with incorrect number of windows. Expects: 4, Received: ${windows.length}}`);
    }

    await assertAdjacent(t, windows[0], windows[1], 'right');
    await assertAdjacent(t, windows[0], windows[2], 'bottom');
    await assertAdjacent(t, windows[1], windows[3], 'bottom');
    await assertAdjacent(t, windows[2], windows[3], 'right');
}