import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as robot from 'robotjs';

import {Point} from '../../../src/provider/snapanddock/utils/PointUtils';
import {getTabbedWindows} from '../../demo/utils/tabServiceUtils';
import {delay} from '../../provider/utils/delay';
import {getBounds, NormalizedBounds} from '../../provider/utils/getBounds';

const MAX_TAB_WIDTH = 220;  // From tabstrip CSS

/**
 * Util using RobotJS to click on the handle for a specified tab, marking it active.
 */
export async function switchTab(tabstrip: _Window, tabIndex: number) {
    await mouseOverTabHandle(tabstrip, tabIndex);
    await robot.mouseClick();
    await delay(500);
}

/**
 * Util using RobotJS to drag a tab handle up and out of the tabstrip, ejecting the tab.
 */
export async function tearoutTab(tabstrip: _Window, tabIndex: number) {
    const bounds: Bounds = await getBounds(tabstrip);
    return tearoutToPoint(tabstrip, tabIndex, {x: bounds.left - 40, y: bounds.top - 40});
}

/**
 * Util using RobotJS to drag a tab handle over a different tabstrip, ejecting from the source and adding to the target.
 */
export async function tearoutToOtherTabstrip(sourceTabstrip: _Window, tabIndex: number, targetTabstrip: _Window) {
    const targetBounds: NormalizedBounds = await getBounds(targetTabstrip);
    return tearoutToPoint(sourceTabstrip, tabIndex, {x: targetBounds.left + 30, y: targetBounds.top + 30});
}

/**
 * Util using RobotJS to drag a tab handle to a specific point, ejecting from the tabset.
 */
export async function tearoutToPoint(sourceTabstrip: _Window, tabIndex: number, target: Point<number>) {
    await mouseOverTabHandle(sourceTabstrip, tabIndex);
    await robot.mouseToggle('down');
    await robot.moveMouseSmooth(target.x, target.y);
    await robot.mouseToggle('up');
    await delay(1000);
}

/**
 * Private helper to position the mouse over the correct tab handle.
 */
async function mouseOverTabHandle(tabstrip: _Window, tabIndex: number) {
    const tabs = await getTabbedWindows(tabstrip.identity);

    const bounds: Bounds = await getBounds(tabstrip);
    const tabWidth = Math.min(bounds.width / tabs.length, MAX_TAB_WIDTH);
    const tabOffset: number = tabIndex * tabWidth;

    await robot.moveMouse(bounds.left + tabOffset + 30, bounds.top + 30);
}
