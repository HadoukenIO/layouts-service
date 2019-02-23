import {Context, GenericTestContext, test, TestContext} from 'ava';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {WindowIdentity} from '../../../src/provider/model/DesktopWindow';
import {promiseMap} from '../../../src/provider/snapanddock/utils/async';
import {assertAllContiguous, assertCompleteGroup, assertCompleteTabGroup, assertNoOverlap, assertNotMoved} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getEntityBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {executeJavascriptOnService} from '../utils/serviceUtils';

interface CreateTabGroupFromTabsOptions extends CreateWindowData {
    snapGroups: number[][];
    tabGroups: number[][];
    newTabGroup: number[];
    ejectedTabGroup: number[];
    description: string;
}

interface CreateTabGroupFromTabsOptionsConfig {
    entitiesInSourceSnapGroup: 1|2;
    entitiesInTargetSnapGroup: 1|2;
    tabsInSourceTabGroup: 1|2|3;
    tabsInTargetTabGroup: 1|2|3;
    tabsToTakeFromSourceTabGroup: 1|2|3;
    tabsToTakeFromTargetTabGroup: 1|2|3;
}

test.afterEach.always(teardown);

testParameterized<CreateTabGroupFromTabsOptions, WindowContext>(
    (testOptions: CreateTabGroupFromTabsOptions): string => `createTabGroupFromTabs ${testOptions.description}`,
    [
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 2,
            entitiesInTargetSnapGroup: 2,
            tabsInSourceTabGroup: 1,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1
        }),

        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 2,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 2,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 1
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 3,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 1
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 3,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 3,
            tabsToTakeFromTargetTabGroup: 1
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 2,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 1
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 2,
            tabsInTargetTabGroup: 2,
            tabsToTakeFromSourceTabGroup: 2,
            tabsToTakeFromTargetTabGroup: 2
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 2,
            tabsInTargetTabGroup: 3,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 2
        }),
        createCreateTabGroupFromTabsOption({
            entitiesInSourceSnapGroup: 1,
            entitiesInTargetSnapGroup: 1,
            tabsInSourceTabGroup: 2,
            tabsInTargetTabGroup: 3,
            tabsToTakeFromSourceTabGroup: 1,
            tabsToTakeFromTargetTabGroup: 3
        })
    ],
    createWindowTest(async (t, testOptions: CreateTabGroupFromTabsOptions) => {
        const windows = t.context.windows;

        const newTabs = testOptions.newTabGroup.map(index => windows[index]);
        const ejectedTabs = testOptions.ejectedTabGroup.map(index => windows[index]);

        await setupSnapAndTabGroups(t, testOptions);

        const oldBounds = await getBoundsMap(windows);

        function remoteCreateTabGroupWithTabs(this: ProviderWindow, identities: WindowIdentity[]) {
            return this.tabService.createTabGroupWithTabs(identities);
        }
        await executeJavascriptOnService(remoteCreateTabGroupWithTabs, newTabs.map(window => window.identity as WindowIdentity));

        const newBounds = await getBoundsMap(windows);

        // Assert windows passed to createTabGroupWithTabs form a TabGroup
        await assertCompleteTabGroup(t, ...newTabs);

        // Assert ejected tabs form a TabGroup
        await assertCompleteTabGroup(t, ...ejectedTabs);

        // Assert new TabGroup is positioned on first window passed to createTabGroupWithTabs
        await assertNotMoved(oldBounds.get(newTabs[0])!, newBounds.get(newTabs[0])!, t);

        // Assert ejected TabGroup has not moved
        await assertNotMoved(oldBounds.get(ejectedTabs[0])!, newBounds.get(ejectedTabs[0])!, t);

        // Assert no other windows have moved
        await Promise.all(windows.filter(window => !newTabs.includes(window)).map(window => {
            return assertNotMoved(oldBounds.get(window)!, newBounds.get(window)!, t);
        }));
    }));


function createCreateTabGroupFromTabsOption(config: CreateTabGroupFromTabsOptionsConfig): CreateTabGroupFromTabsOptions {
    let windowCount = 0;

    const sourceSnapGroup: number[] = [];
    for (let i = 0; i < config.entitiesInSourceSnapGroup; i++) {
        sourceSnapGroup.push(windowCount++);
    }

    const targetSnapGroup: number[] = [];
    for (let i = 0; i < config.entitiesInTargetSnapGroup; i++) {
        targetSnapGroup.push(windowCount++);
    }

    const sourceTabGroup = [sourceSnapGroup[0]];
    for (let i = 1; i < config.tabsInSourceTabGroup; i++) {
        sourceTabGroup.push(windowCount++);
    }

    const targetTabGroup = [targetSnapGroup[0]];
    for (let i = 1; i < config.tabsInTargetTabGroup; i++) {
        targetTabGroup.push(windowCount++);
    }

    const newTabGroup: number[] = [];
    for (let i = 0; i < config.tabsToTakeFromSourceTabGroup; i++) {
        newTabGroup.push(sourceTabGroup[i]);
    }
    for (let i = 0; i < config.tabsToTakeFromTargetTabGroup; i++) {
        newTabGroup.push(targetTabGroup[i]);
    }

    const snapGroups = [sourceSnapGroup, targetSnapGroup];
    const tabGroups = [sourceTabGroup, targetTabGroup];

    const ejectedTabGroup = sourceTabGroup.filter(tab => !newTabGroup.includes(tab));

    const description = `entitiesInSourceSnapGroup: ${config.entitiesInSourceSnapGroup}, entitiesInTargetSnapGroup: ${
        config.entitiesInTargetSnapGroup}, tabsInSourceTabGroup: ${config.tabsInSourceTabGroup}, tabsInTargetTabGroup: ${
        config.tabsInTargetTabGroup}, tabsToTakeFromSourceTabGroup: ${config.tabsToTakeFromSourceTabGroup}, tabsToTakeFromTargetTabGroup: ${
        config.tabsToTakeFromTargetTabGroup}`;

    return {windowCount, snapGroups, tabGroups, newTabGroup, ejectedTabGroup, description, frame: true};
}

async function setupSnapAndTabGroups(t: GenericTestContext<Context<WindowContext>>, testOptions: CreateTabGroupFromTabsOptions) {
    const windows = t.context.windows;

    // Create each SnapGroup by dragging each window to the right of the last
    for (let i = 0; i < testOptions.snapGroups.length; i++) {
        const snapGroup = testOptions.snapGroups[i];
        const snapGroupWindows = snapGroup.map(index => windows[index]);
        for (let j = 0; j < snapGroup.length - 1; j++) {
            await dragSideToSide(snapGroupWindows[j + 1], 'left', snapGroupWindows[j], 'right');
        }
        await assertCompleteGroup(t, ...snapGroupWindows);
        await assertAllContiguous(t, snapGroupWindows);
        await assertNoOverlap(t, snapGroupWindows);
    }

    // Create each TabGroup by dragging each window onto the first
    for (let i = 0; i < testOptions.tabGroups.length; i++) {
        const tabGroup = testOptions.tabGroups[i];
        const tabGroupWindows = tabGroup.map(index => windows[index]);
        for (let j = 1; j < tabGroup.length; j++) {
            await tabWindowsTogether(tabGroupWindows[0], tabGroupWindows[j]);
        }
        await assertCompleteTabGroup(t, ...tabGroupWindows);
    }
}

async function getBoundsMap(windows: _Window[]): Promise<Map<_Window, NormalizedBounds>> {
    const boundsMap = new Map<_Window, NormalizedBounds>();

    await promiseMap(windows, async window => {
        const bounds = await getEntityBounds(window);
        boundsMap.set(window, bounds);
    });

    return boundsMap;
}
