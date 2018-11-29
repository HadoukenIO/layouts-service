import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as robot from 'robotjs';

import {getTabbedWindows} from '../../demo/utils/tabServiceUtils';

import {delay} from './delay';
import {getBounds, NormalizedBounds} from './getBounds';

const MAX_TAB_WIDTH = 220;  // From tabstrip CSS

export async function switchTab(tabstrip: _Window, tabIndex: number) {
    const tabs = await getTabbedWindows(tabstrip.identity);

    const bounds: Bounds = await getBounds(tabstrip);
    const tabWidth = Math.min(bounds.width / tabs.length, MAX_TAB_WIDTH);
    const tabOffset: number = tabIndex * tabWidth;

    await robot.moveMouse(bounds.left + tabOffset + 30, bounds.top + 30);
    await robot.mouseClick();
    await delay(1000);
}

export async function tearoutTab(tabstrip: _Window, tabIndex: number) {
    const tabs = await getTabbedWindows(tabstrip.identity);

    const bounds: Bounds = await getBounds(tabstrip);
    const tabWidth = Math.min(bounds.width / tabs.length, MAX_TAB_WIDTH);
    const tabOffset: number = tabIndex * tabWidth;

    await robot.moveMouse(bounds.left + tabOffset + 30, bounds.top + 30);
    await robot.mouseToggle('down');
    await robot.moveMouseSmooth(bounds.left - 40, bounds.top - 40);
    await robot.mouseToggle('up');

    await delay(1000);
}

export async function tearoutToOtherTabstrip(sourceTabstrip: _Window, tabIndex: number, targetTabstrip: _Window) {
    const tabs = await getTabbedWindows(sourceTabstrip.identity);

    const sourceBounds: NormalizedBounds = await getBounds(sourceTabstrip);
    const targetBounds: NormalizedBounds = await getBounds(targetTabstrip);
    const tabWidth = Math.min(sourceBounds.width / tabs.length, MAX_TAB_WIDTH);
    const tabOffset: number = tabIndex * tabWidth;

    await robot.moveMouse(sourceBounds.left + tabOffset + 30, sourceBounds.top + 30);
    await robot.mouseToggle('down');
    await robot.moveMouseSmooth(targetBounds.left + 30, targetBounds.top + 30);
    await robot.mouseToggle('up');

    await delay(1000);
}