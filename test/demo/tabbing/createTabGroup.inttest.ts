import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {promiseForEach, promiseMap} from '../../../src/provider/snapanddock/utils/async';
import {assertAllContiguous, assertCompleteGroup, assertCompleteTabGroup, assertNoOverlap, assertNotMoved} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getEntityBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {itParameterized} from '../utils/parameterizedTestUtils';
import {layoutsClientPromise} from '../utils/serviceUtils';

interface CreateTabGroupFromTabsOptions extends CreateWindowData {
    snapGroups: number[][];
    tabGroups: number[][];
    newTabGroup: number[];
    ejectedTabGroup: number[];
    description: string;
}

// High-level representation of test parameters that we will use to construct each CreateTabGroupFromTabsOptions
interface CreateTabGroupOptionsConfig {
    entitiesInTargetSnapGroup: 1|2;
    entitiesInSourceSnapGroup: 1|2;
    tabsInTargetTabGroup: 1|2|3;
    tabsInSourceTabGroup: 1|2|3;
    tabsToTakeFromTargetTabGroup: 1|2|3;
    tabsToTakeFromSourceTabGroup: 1|2|3;
}

// We use a more spaced out window arrangement so we don't snap when we should tab
const windowPositions = [
    {defaultTop: 100, defaultLeft: 100},
    {defaultTop: 100, defaultLeft: 375},
    {defaultTop: 100, defaultLeft: 650},
    {defaultTop: 100, defaultLeft: 925},
    {defaultTop: 650, defaultLeft: 100},
    {defaultTop: 650, defaultLeft: 375},
    {defaultTop: 650, defaultLeft: 650},
    {defaultTop: 650, defaultLeft: 925},
];

afterEach(teardown);

itParameterized<CreateTabGroupFromTabsOptions>(
    'When calling createTabGroup, windows are tabbed, grouped, and moved as expected',
    (testOptions: CreateTabGroupFromTabsOptions): string => `${testOptions.description}`,
    [
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 1
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 2,
            entitiesInSourceSnapGroup: 2,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 1
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 1
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 2
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 3,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 2
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 3,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 3
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 1,
            tabsToTakeFromSourceTabGroup: 1
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsInSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 2
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 3,
            tabsInSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 1
        }),
        createCreateTabGroupOption({
            entitiesInTargetSnapGroup: 1,
            entitiesInSourceSnapGroup: 1,
            tabsInTargetTabGroup: 3,
            tabsInSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 3,
            tabsToTakeFromSourceTabGroup: 1
        }),
        createCreateTabGroupOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 2,
            tabsInSourceTabGroup: 1,
            tabsInTargetTabGroup: 3,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1
        })
    ],
    createWindowTest(async (context, testOptions: CreateTabGroupFromTabsOptions) => {
        const {windows} = context;

        const newTabs = testOptions.newTabGroup.map(index => windows[index]);
        const ejectedTabs = testOptions.ejectedTabGroup.map(index => windows[index]);

        await setupSnapAndTabGroups(context, testOptions);

        const oldBounds = await getBoundsMap(windows);

        const layoutsClient = await layoutsClientPromise;
        await layoutsClient.tabbing.createTabGroup(newTabs.map(window => window.identity));

        const newBounds = await getBoundsMap(windows);

        // Assert windows passed to createTabGroup form a TabGroup
        await assertCompleteTabGroup(...newTabs);

        // Assert ejected tabs form a TabGroup
        await assertCompleteTabGroup(...ejectedTabs);

        // Assert ejected tabs form a SnapGroup
        await assertCompleteGroup(...ejectedTabs);

        // Assert new TabGroup is positioned on first window passed to createTabGroupWithTabs
        await assertNotMoved(oldBounds.get(newTabs[0])!, newBounds.get(newTabs[0])!);

        // Assert ejected TabGroup has not moved
        await assertNotMoved(oldBounds.get(ejectedTabs[0])!, newBounds.get(ejectedTabs[0])!);

        // Assert no other windows have moved
        await Promise.all(windows.filter(window => !newTabs.includes(window)).map(window => {
            return assertNotMoved(oldBounds.get(window)!, newBounds.get(window)!);
        }));
    }, undefined, undefined, windowPositions));

// Takes the high level test representation of CreateTabGroupFromTabsOptionsConfig and outputs a CreateTabGroupFromTabsOptions that we can use directly in the
// test
function createCreateTabGroupOption(config: CreateTabGroupOptionsConfig): CreateTabGroupFromTabsOptions {
    let windowCount = 0;

    // Construct window index arrays representing each SnapGroup
    const targetSnapGroup: number[] = [];
    for (let i = 0; i < config.entitiesInTargetSnapGroup; i++) {
        targetSnapGroup.push(windowCount++);
    }
    const sourceSnapGroup: number[] = [];
    for (let i = 0; i < config.entitiesInSourceSnapGroup; i++) {
        sourceSnapGroup.push(windowCount++);
    }

    // Construct window index arrays representing each TabGroup
    const targetTabGroup = [targetSnapGroup[0]];
    for (let i = 1; i < config.tabsInTargetTabGroup; i++) {
        targetTabGroup.push(windowCount++);
    }
    const sourceTabGroup = [sourceSnapGroup[0]];
    for (let i = 1; i < config.tabsInSourceTabGroup; i++) {
        sourceTabGroup.push(windowCount++);
    }

    // Construct window index array representing the new TabGroup we'll test creating
    const newTabGroup: number[] = [];
    for (let i = 0; i < config.tabsToTakeFromTargetTabGroup; i++) {
        newTabGroup.push(targetTabGroup[i]);
    }
    for (let i = 0; i < config.tabsToTakeFromSourceTabGroup; i++) {
        newTabGroup.push(sourceTabGroup[i]);
    }

    const snapGroups = [targetSnapGroup, sourceSnapGroup];
    const tabGroups = [targetTabGroup, sourceTabGroup];

    // Compute a window index array of the expected ejected TabGroup
    const ejectedTabGroup = targetTabGroup.filter(tab => !newTabGroup.includes(tab));

    const description = `entitiesInTargetSnapGroup: ${config.entitiesInTargetSnapGroup}, entitiesInSourceSnapGroup: ${
        config.entitiesInSourceSnapGroup}, tabsInTargetTabGroup: ${config.tabsInTargetTabGroup}, tabsInSourceTabGroup: ${
        config.tabsInSourceTabGroup}, tabsToTakeFromTargetTabGroup: ${config.tabsToTakeFromTargetTabGroup}, tabsToTakeFromSourceTabGroup: ${
        config.tabsToTakeFromSourceTabGroup}`;

    return {windowCount, snapGroups, tabGroups, newTabGroup, ejectedTabGroup, description, frame: true};
}

async function setupSnapAndTabGroups(context: WindowContext, testOptions: CreateTabGroupFromTabsOptions) {
    const {windows} = context;

    // Create each SnapGroup by dragging each window to the right of the last
    await promiseForEach(testOptions.snapGroups, async (snapGroup) => {
        const snapGroupWindows = snapGroup.map(index => windows[index]);
        for (let i = 0; i < snapGroup.length - 1; i++) {
            await dragSideToSide(snapGroupWindows[i + 1], 'left', snapGroupWindows[i], 'right');
        }
        await assertCompleteGroup(...snapGroupWindows);
        await assertAllContiguous(snapGroupWindows);
        await assertNoOverlap(snapGroupWindows);
    });

    // Create each TabGroup by dragging each window onto the first
    await promiseForEach(testOptions.tabGroups, async (tabGroup) => {
        const tabGroupWindows = tabGroup.map(index => windows[index]);
        for (let i = 1; i < tabGroup.length; i++) {
            await tabWindowsTogether(tabGroupWindows[0], tabGroupWindows[i]);
        }
        await assertCompleteTabGroup(...tabGroupWindows);
    });
}

async function getBoundsMap(windows: _Window[]): Promise<Map<_Window, NormalizedBounds>> {
    const boundsMap = new Map<_Window, NormalizedBounds>();

    await promiseMap(windows, async window => {
        const bounds = await getEntityBounds(window);
        boundsMap.set(window, bounds);
    });

    return boundsMap;
}
