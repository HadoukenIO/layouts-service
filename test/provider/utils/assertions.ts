import deepEqual from 'fast-deep-equal';
import {Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {promiseFilter, promiseMap} from '../../../src/provider/snapanddock/utils/async';
import {getTopmostWindow} from '../../demo/utils/modelUtils';
import {getGroupedWindows, getSnapGroupID} from '../../demo/utils/snapServiceUtils';
import {getActiveTab, getId, getTabbedWindows, getTabGroupID, getTabGroupIdentity, getTabstrip} from '../../demo/utils/tabServiceUtils';

import {getBounds, NormalizedBounds} from './bounds';
import {Win} from './getWindow';
import {isAdjacentTo} from './isAdjacentTo';
import {getContiguousWindows} from './isContiguousGroup';
import {isOverlappedWith} from './isOverlappedWith';
import {Side} from './SideUtils';

/**
 * Assert that the given windows are **all** part of the same snap group.
 */
export async function assertGrouped(...windows: Window[]) {
    if (windows.length < 2) {
        throw new Error('Too few windows passed to assertGrouped. Requires at least two windows');
    }
    // Get the native openfin groups for each window
    const groups = await promiseMap(windows, async win => win.getGroup());
    // Check that all of the windows have the same native group
    for (let i = 0; i < groups.length - 1; i++) {
        // If the groups are not the same length skip all other checks and fail immediately.
        if (groups[i].length !== groups[0].length) {
            assert.fail(`Window ${i} has a different native group to window 0`);
            break;
        }
        let result = true;
        // Check window-by-window that the groups are the same
        for (let j = 0; j < groups[i].length; j++) {
            result = result && deepEqual(groups[i][j].identity, groups[0][j].identity);
        }
        assert.ok(result, `Window ${i} has a different native group to window 0`);
    }

    // Both windows are in the same SnapGroup
    const snapGroupIDs = await promiseMap(windows, async win => getSnapGroupID(win.identity));
    for (let i = 0; i < snapGroupIDs.length - 1; i++) {
        assert.strictEqual(snapGroupIDs[i], snapGroupIDs[0], `Window ${i} has a different snapGroup to window 0`);
    }
}

/**
 * Assert that the given windows form a complete (one with no other members) SnapGroup. SnapGroup may be trivial
 */
export async function assertCompleteGroup(...windows: Window[]): Promise<void> {
    if (windows.length === 1) {
        await assertNotGrouped(windows[0]);
    } else if (windows.length > 1) {
        await assertGrouped(...windows);

        const group = await promiseFilter(await windows[0].getGroup(), async (window) => {
            const tabGroupID = await getTabGroupID(window.identity);

            if (tabGroupID) {
                const tabstrip = await getTabstrip(window.identity);
                return !deepEqual(tabstrip.identity, window.identity);
            } else {
                return true;
            }
        });
        assert.strictEqual(windows.length, group.length, 'Unexpected number of windows in group');
    }
}

/**
 * Assert that a given window is not part of a SnapGroup of native window group.
 */
export async function assertNotGrouped(win: Window) {
    // Window is not native grouped
    const group = await win.getGroup();
    assert.strictEqual(group.length, 0);

    // Window is alone in it's SnapGroup
    const snapGroup = await getGroupedWindows(win.identity);
    assert.strictEqual(snapGroup.length, 1);
}

export async function assertNotGroupedTogether(win1: Window, win2: Window) {
    const groups = await promiseMap([win1, win2], async win => win.getGroup());

    // Quick pass if groups are of unequal length or of length 0
    if (groups[0].length !== groups[1].length || groups[0].length === 0) {
        return;
    }

    assert.notDeepEqual(
        groups[0],
        groups[1],
        `Window ${win1.identity.uuid + '/' + win1.identity.name} in same native group as ${win2.identity.uuid + '/' + win2.identity.name}`
    );

    const snapGroupIDs = await promiseMap([win1, win2], async win => getSnapGroupID(win.identity));
    assert.notStrictEqual(
        snapGroupIDs[0],
        snapGroupIDs[1],
        `Window ${win1.identity.uuid + '/' + win1.identity.name} in same snapGroup as ${win2.identity.uuid + '/' + win2.identity.name}`
    );
}

/**
 * Assert that **none** of the given windows are part of the same snap group.
 */
export async function assertNoneGroupedTogether(...windows: Window[]) {
    if (windows.length < 2) {
        throw new Error('Too few windows passed to assertGrouped. Requires at least two windows');
    }

    for (let i = 0; i < windows.length; i++) {
        for (let j = i + 1; j < windows.length; j++) {
            assertNotGroupedTogether(windows[i], windows[j]);
        }
    }
}

export function assertMoved(bounds1: NormalizedBounds, bounds2: NormalizedBounds) {
    assert.notDeepEqual(bounds1, bounds2);
}

export function assertNotMoved(bounds1: NormalizedBounds, bounds2: NormalizedBounds) {
    assert.deepEqual(bounds1, bounds2);
}

/**
 * Assert that the given windows are part of the same TabGroup.
 */
export async function assertPairTabbed(win1: Window, win2: Window): Promise<void> {
    // Get the tabGroup UUID for each window
    const [tabGroupID1, tabGroupID2] = [await getTabGroupID(win1.identity), await getTabGroupID(win2.identity)];

    // Assert that the windows have the same UUID and that is is not null
    assert.strictEqual(tabGroupID1, tabGroupID2);
    assert.notStrictEqual(tabGroupID1, null);

    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        assert.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

    // Both windows have the same bounds
    const [bounds1, bounds2] = [await getBounds(win1), await getBounds(win2)];
    assert.deepEqual(bounds1, bounds2, 'Tabbed windows do not have the same bounds');

    // Both windows are attached to the tabStrip
    const tabStripWindow = group1.find((win: Window) => getId(win.identity) === tabGroupID1);
    if (tabStripWindow) {
        await assertAdjacent(tabStripWindow, win1, 'bottom');
    } else {
        assert.fail('Windows are not native grouped to the tabStrip A');
        return Promise.reject(new Error('Windows are not native grouped to the tabStrip B'));
    }

    // Windows are shown/hidden correctly if active/inactive tab
    for (const win of [win1, win2]) {
        const isShowing = await win.isShowing();
        const shouldBeShowing = deepEqual(win.identity, await getActiveTab(win.identity));
        assert.strictEqual(
            isShowing,
            shouldBeShowing,
            `Window ${'"' + win.identity.uuid + '/' + win.identity.name + '"'} expected to ${shouldBeShowing ? 'not ' : ''}be hidden, but was${
                isShowing ? ' not.' : '.'}`
        );
    }
}

/**
 * Assert that the given windows form a complete TabGroup (or no TabGroup if less than two windows)
 */
export async function assertCompleteTabGroup(...windows: Window[]): Promise<void> {
    if (windows.length === 1) {
        await assertNotTabbed(windows[0]);
    } else if (windows.length > 1) {
        for (let i = 1; i < windows.length; i++) {
            await assertPairTabbed(windows[0], windows[i]);
        }

        const numTabs = (await getTabbedWindows(windows[0].identity)).length;
        assert.strictEqual(numTabs, windows.length, `TabGroup expected to contain ${windows.length} windows, but contains ${numTabs} windows.`);
    }
}

/**
 * Assert that the given window is both tabbed and the active tab in its tabset.
 */
export async function assertActiveTab(window: Window) {
    // For a tab to be active it must be a tab.
    await assertTabbed(window);

    assert.deepEqual(await getActiveTab(window.identity), window.identity);

    // Active tab is not hidden
    assert.strictEqual(await window.isShowing(), true);
    // Active tab is on top
    const bounds = await getBounds(window);
    assert.deepEqual(await getTopmostWindow({x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2}), window.identity, 'Active tab not on top.');
    // All other tabs are hidden
    const tabbedWindows = await getTabbedWindows(window.identity);
    for (const tab of tabbedWindows) {
        if (!deepEqual(tab, window.identity)) {
            assert.strictEqual(await fin.Window.wrapSync(tab).isShowing(), false);
        }
    }
}

/**
 * Assert that a given window is part of a TabGroup.
 */
export async function assertTabbed(win: Window): Promise<void> {
    // Get the tabGroup ID for the window
    const tabGroupID = await getTabGroupIdentity(win.identity);
    // Un-tabbed windows will return null
    assert.notStrictEqual(tabGroupID, null);
}

/**
 * Assert that a given window is not part of a TabGroup.
 */
export async function assertNotTabbed(win: Window): Promise<void> {
    // Get the tabGroup ID for the window
    const tabGroupID = await getTabGroupIdentity(win.identity);
    // Un-tabbed windows will return null
    assert.strictEqual(tabGroupID, null);
}

/**
 * Assert that two given windows are adjacent. If side is not specified, will check on all sides
 * and pass if any are true.
 */
export async function assertAdjacent(win1: Win, win2: Win, side?: Side): Promise<void> {
    assert.strictEqual(await isAdjacentTo(win1, win2, side), true);
}

/**
 * Will assert that the four windows given to it are adjacent and form a square.
 * Windows are numbered as in the following pattern:
 *   0 1
 *   2 3
 */
export async function assertSquare(...windows: Win[]) {
    if (windows.length !== 4) {
        throw new Error(`assertSquare called with incorrect number of windows. Expects: 4, Received: ${windows.length}}`);
    }

    await assertAdjacent(windows[0], windows[1], 'right');
    await assertAdjacent(windows[0], windows[2], 'bottom');
    await assertAdjacent(windows[1], windows[3], 'bottom');
    await assertAdjacent(windows[2], windows[3], 'right');
}

/**
 * Assert that some given set of windows are adjacent to each other in such a way as to
 * form a contiguous set of windows (i.e. no physically disjoint windows)
 */
export async function assertAllContiguous(windows: Window[]) {
    const actualGroups = await getContiguousWindows(windows);
    if (actualGroups.length > 1 || (actualGroups.length === 1 && actualGroups[0].length !== windows.length)) {
        const expectedGroupsString: string = '[' + windows.map(w => w.identity.uuid + '/' + w.identity.name).join(', ') + ']';
        const actualGroupsString: string = actualGroups.map(g => '[' + g.map(w => w.identity.uuid + '/' + w.identity.name).join(', ') + ']').join('\n ');
        assert.fail(`Windows do not form a contiguous group. \nExpected: ${expectedGroupsString} \nActual: ${actualGroupsString}`);
    }
}

export async function assertNoOverlap(windows: Window[]) {
    for (let i = 0; i < windows.length - 1; i++) {
        for (let j = i + 1; j < windows.length; j++) {
            assert.strictEqual(await isOverlappedWith(windows[i], windows[j]), false, `Window ${i} is overlapped with window ${j}`);
        }
    }
}

export async function assertAllMinimizedOrHidden(windows: Window[]) {
    return Promise.all(windows.map(async win => {
        const showing = await win.isShowing();
        const state = await win.getState();
        assert.strictEqual(state === 'minimized' || !showing, true);
    }));
}

export async function assertAllMaximized(windows: Window[]) {
    return Promise.all(windows.map(async win => {
        const state = await win.getState();
        assert.strictEqual(state, 'maximized');
    }));
}

export async function assertAllNormalState(windows: Window[]) {
    return Promise.all(windows.map(async win => {
        const state = await win.getState();
        assert.strictEqual(state, 'normal');
    }));
}

export async function assertDoesNotReject<T>(promise: Promise<T>, message: string|undefined = undefined): Promise<void> {
    let rejected = false;
    await promise.catch(() => {
        rejected = true;
    });

    assert.strictEqual(rejected, false);
}

export async function assertRejects<T>(promise: Promise<T>, message: string|undefined = undefined): Promise<void> {
    let rejected = false;
    await promise.catch(() => {
        rejected = true;
    });

    assert.strictEqual(rejected, true);
}
