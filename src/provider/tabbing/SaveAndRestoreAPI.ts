import {TabBlob, TabIdentifier} from '../../client/types';
import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';
import {createTabGroupsFromMultipleWindows} from './TabUtilities';

/**
 * Gathers information from tab sets and their tabs, and returns as a JSON object back to the requesting application/window.
 * @param uuid Uuid of the requesting Application
 * @param name Name of the requesting window
 * @returns {TabBlob[] | undefined} Returns undefined if a tab service is not around.
 */
export async function getTabSaveInfo(): Promise<TabBlob[]|undefined> {
    if (!TabService.INSTANCE) {
        console.error('No Tab Service!');
        return;
    }

    return Promise.all(TabService.INSTANCE.tabGroups.map(async (group: TabGroup) => {
        const tabs: TabIdentifier[] = group.tabs.map((tab: Tab) => {
            return tab.ID;
        });

        const [groupBounds, appBounds] = await Promise.all([group.window.getWindowBounds(), group.activeTab.window.getWindowBounds()]);

        const groupInfo = {
            url: group.window.initialWindowOptions.url!,
            active: group.activeTab.ID,
            dimensions:
                {x: groupBounds.left!, y: groupBounds.top!, width: groupBounds.width!, tabGroupHeight: groupBounds.height!, appHeight: appBounds.height!}
        };

        return {tabs, groupInfo};
    }));
}

/**
 * Restores tabs and tab groups using the given tab blob information.
 * @param {TabBlob[]} tabBlob Array of TabBlobs
 */
export function restoreTabs(tabBlob: TabBlob[]): Promise<void> {
    if (!TabService.INSTANCE) {
        return Promise.reject('No Tab Service!');
    }

    return createTabGroupsFromMultipleWindows(tabBlob);
}
