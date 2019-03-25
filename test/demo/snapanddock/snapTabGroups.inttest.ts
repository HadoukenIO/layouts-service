import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {assertActiveTab, assertGrouped, assertNotTabbed, assertPairTabbed} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide, dragWindowTo} from '../../provider/utils/dragWindowTo';
import {opposite, Side, Sides} from '../../provider/utils/SideUtils';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest, WindowContext} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import {getTabstrip} from '../utils/tabServiceUtils';
import {switchTab, tearoutTab, tearoutToOtherTabstrip} from '../utils/tabstripUtils';

interface SnapTabInstanceData {
    side: Side;
}

afterEach(teardown);

/**
 * Performs the necessary test setup - tabs the windows into two tab groups, then snaps those groups together.
 *
 * Will return the tabstrips that are created when tabbing the windows together, for use in future setup/assertions.
 *
 * @param side Where to snap the second tabset, relative to the first
 * @param windows Windows being used by the test
 */
async function tabSnapAndMove(side: Side, windows: _Window[]): Promise<[_Window, _Window]> {
    // Create tab groups
    await tabWindowsTogether(windows[0], windows[1]);
    await tabWindowsTogether(windows[2], windows[3]);
    const tabstrips: [_Window, _Window] = await Promise.all([getTabstrip(windows[0].identity), getTabstrip(windows[2].identity)]);

    // Snap tabgroups together
    await delay(2000);
    await windows[0].bringToFront();
    await tabstrips[1].bringToFront();
    await delay(2000);
    await dragSideToSide(tabstrips[1], opposite(side), windows[0], side, {x: 10, y: 10});

    // Move snap group
    const bounds: Bounds = await tabstrips[0].getBounds();
    await dragWindowTo(tabstrips[0], bounds.left + 300, bounds.top + 200);

    return tabstrips;
}

testParameterized<SnapTabInstanceData&CreateWindowData>(
    (instance) => `Can snap tabsets together: ${instance.side}`,
    [{side: Sides.right}, {side: Sides.bottom}].map(instance => ({...instance, frame: true, windowCount: 4})),
    createWindowTest(async (context, instance: SnapTabInstanceData&CreateWindowData) => {
        const windows = context.windows;

        await tabSnapAndMove(instance.side, windows);

        // Assert tabbed
        await assertPairTabbed(windows[0], windows[1]);
        await assertPairTabbed(windows[2], windows[3]);
        await assertGrouped(...windows);
    }));

testParameterized<SnapTabInstanceData&CreateWindowData>(
    `Tab groups remain functional once grouped`,
    [{side: Sides.right}].map(instance => ({...instance, frame: true, windowCount: 4})),
    createWindowTest(async (context, instance: SnapTabInstanceData&CreateWindowData) => {
        const windows = context.windows;

        const tabstrips = await tabSnapAndMove('right', windows);

        await switchTab(tabstrips[0], 1);
        await assertActiveTab(windows[1]);
        await switchTab(tabstrips[0], 0);
        await assertActiveTab(windows[0]);

        await switchTab(tabstrips[1], 0);
        await assertActiveTab(windows[2]);
        await switchTab(tabstrips[1], 1);
        await assertActiveTab(windows[3]);
        await switchTab(tabstrips[1], 0);
        await assertActiveTab(windows[2]);

        await assertPairTabbed(windows[0], windows[1]);
        await assertPairTabbed(windows[2], windows[3]);
        await assertGrouped(...windows);
    }));

testParameterized<SnapTabInstanceData&CreateWindowData>(
    `Can tearout tab from snapped tabgroup`,
    [{side: Sides.right}].map(instance => ({...instance, frame: true, windowCount: 4})),
    createWindowTest(async (context) => {
        const windows = context.windows;

        const tabstrips = await tabSnapAndMove('right', windows);

        await tearoutTab(tabstrips[0], 0);

        await assertNotTabbed(windows[0]);
        await assertNotTabbed(windows[1]);

        await assertPairTabbed(windows[2], windows[3]);
        await assertGrouped(...windows.slice(1));
    }));

testParameterized<SnapTabInstanceData&CreateWindowData>(
    `Can tab into snapped window`,
    [{side: Sides.right}, {side: Sides.bottom}].map(instance => ({...instance, frame: true, windowCount: 4})),
    createWindowTest(async (context, instance: SnapTabInstanceData&CreateWindowData) => {
        const windows = context.windows;
        const side = instance.side;

        // Create tab group
        await tabWindowsTogether(windows[0], windows[1]);
        const tabstrip: _Window = await getTabstrip(windows[0].identity);

        // Snap first to tabgroup together
        await dragSideToSide(tabstrip, opposite(side), windows[2], side, {x: 10, y: 10});

        // Tab remaining window to snapped window
        await tabWindowsTogether(windows[2], windows[3]);

        await assertPairTabbed(windows[0], windows[1]);
        await assertPairTabbed(windows[2], windows[3]);
        await assertGrouped(...windows);
    }));

testParameterized<SnapTabInstanceData&CreateWindowData>(
    `Can tearout into snapped window`,
    [{side: Sides.right}, {side: Sides.bottom}].map(instance => ({...instance, frame: true, windowCount: 4})),
    createWindowTest(async (context, instance: SnapTabInstanceData&CreateWindowData) => {
        const windows = context.windows;
        const side = instance.side;

        // Create tab group
        await tabWindowsTogether(windows[0], windows[1]);
        await tabWindowsTogether(windows[0], windows[2]);
        const tabstrip: _Window = await getTabstrip(windows[0].identity);

        // Snap first to tabgroup together
        await dragSideToSide(tabstrip, opposite(side), windows[3], side, {x: 10, y: 10});

        // Tab remaining window to snapped window
        await tearoutToOtherTabstrip(tabstrip, 2, windows[3]);

        // Move window to visually verify windows are still grouped
        const bounds: Bounds = await tabstrip.getBounds();
        await dragWindowTo(tabstrip, bounds.left + -300, bounds.top + -200);

        await assertPairTabbed(windows[0], windows[1]);
        await assertPairTabbed(windows[2], windows[3]);
        await assertGrouped(...windows);
    }));

testParameterized<SnapTabInstanceData&CreateWindowData>(
    `Can tearout into other group`,
    [{side: Sides.right}, {side: Sides.bottom}].map(instance => ({...instance, frame: true, windowCount: 5})),
    createWindowTest(async (context, instance: SnapTabInstanceData&CreateWindowData) => {
        const windows = context.windows;
        const side = instance.side;

        // Create tab group
        await tabWindowsTogether(windows[0], windows[1]);
        await tabWindowsTogether(windows[0], windows[2]);
        const tabstrip: _Window = await getTabstrip(windows[0].identity);

        // Snap first to tabgroup together
        await dragSideToSide(windows[4], opposite(side), windows[3], side, {x: 10, y: 10});

        // Tab remaining window to snapped window
        await tearoutToOtherTabstrip(tabstrip, 2, windows[3]);

        await assertPairTabbed(windows[0], windows[1]);
        await assertPairTabbed(windows[2], windows[3]);
        await assertGrouped(...windows.slice(2));
    }));