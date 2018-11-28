import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as robot from 'robotjs';

import {WindowIdentity} from '../../../src/provider/model/DesktopWindow';
import {executeJavascriptOnService} from '../../demo/utils/serviceUtils';

import {delay} from './delay';

const MAX_TAB_WIDTH = 220;  // From tabstrip CSS

/**
 * Fetches the identities of any tabs within a tabgroup, given any window that belongs to the group.
 *
 * Input can be either a tabstrip or application window, but must be valid and must belong to a tab group.
 *
 * @param window Any valid window that belongs to a tab group
 */
export async function getTabs(window: _Window): Promise<WindowIdentity[]> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity) {
        const tabWindow = this.model.getWindow(identity as WindowIdentity);
        const tabGroup = tabWindow && tabWindow.getTabGroup();

        if (tabGroup) {
            return tabGroup.tabs.map(tab => tab.getIdentity());
        } else if (!tabWindow) {
            throw new Error(`Not a valid window: '${identity && this.model.getId(identity)}'`);
        } else if (!tabGroup) {
            throw new Error(`Window isn't tabbed: '${identity && this.model.getId(identity)}'`);
        }

        return tabWindow!.getTabGroup()!.tabs.map(tab => tab.getIdentity());
    }

    return await executeJavascriptOnService(remoteFunc, window.identity as WindowIdentity);
}

export async function switchTab(tabstrip: _Window, tabIndex: number) {
    const tabs = await getTabs(tabstrip);

    const bounds: Bounds = await tabstrip.getBounds();
    const tabWidth = Math.min(bounds.width / tabs.length, MAX_TAB_WIDTH);
    const tabOffset: number = tabIndex * tabWidth, mouseY = bounds.top + 10;

    await robot.moveMouse(bounds.left + tabOffset + 30, bounds.top + 30);
    await robot.mouseClick();
    await delay(1000);
}
