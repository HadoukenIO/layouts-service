import * as os from 'os';

import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getActiveTab, getTabGroupID, getTabstrip} from '../../demo/utils/tabServiceUtils';

import {getWindow, Win} from './getWindow';

const isWin10 = os.type() === 'Windows_NT' && os.release().slice(0, 2) === '10';

export interface NormalizedBounds extends Bounds {
    bottom: number;
    right: number;
}

export async function getBounds(identityOrWindow: Win): Promise<NormalizedBounds> {
    const win = await getWindow(identityOrWindow);
    const bounds = await win.getBounds();
    bounds.right = bounds.right || bounds.left + bounds.width;
    bounds.bottom = bounds.bottom || bounds.top + bounds.height;
    if (!isWin10) {
        return bounds as NormalizedBounds;
    }
    const options = await win.getOptions();
    if (!options.frame) {
        return bounds as NormalizedBounds;
    }
    return Object.assign(bounds, {left: bounds.left + 7, right: bounds.right - 7, bottom: bounds.bottom - 7, height: bounds.height - 7, width: bounds.width - 14});
}

export async function getTabsetBounds(tabOrTabstrip: _Window): Promise<NormalizedBounds> {
    const tabGroupID = await getTabGroupID(tabOrTabstrip.identity);
    if (tabGroupID) {
        const tabstrip = await getTabstrip(tabOrTabstrip.identity);

        let tab: _Window;
        if (tabOrTabstrip.identity.name === tabstrip.identity.name) {
            // Provided window is tabstrip. Need to get active tab.
            tab = fin.Window.wrapSync(await getActiveTab(tabOrTabstrip.identity));
        } else {
            // Provided window is tab.
            tab = tabOrTabstrip;
        }

        const tabstripBounds = await getBounds(tabstrip);
        const tabBounds = await getBounds(tab);

        return {
            ...tabBounds,
            top: tabstripBounds.top,
            height: tabstripBounds.height + tabBounds.height
        };
    } else {
        throw new Error('Attempted to get tabstrip bounds of un-tabbed window.');
    }
}

export async function getEntityBounds(window: _Window): Promise<NormalizedBounds> {
    const tabGroupID = await getTabGroupID(window.identity);
    if (tabGroupID) {
        return getTabsetBounds(window);
    } else {
        return getBounds(window);
    }
}
