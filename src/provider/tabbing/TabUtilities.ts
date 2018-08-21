import {TabBlob, TabIdentifier, TabWindowOptions} from '../../client/types';

import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';

/**
 * Ejects or moves a tab/tab group based criteria passed in.
 *
 * 1. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is a window under that point we check if
 * their URLs match and if they do, we allow tabbing to occur.  If not, we cancel out.
 *
 *
 * 2. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is not a window under that point we create a
 * new tab group + tab at the screenX & screenY provided if there are more than 1 tabs in the original group. If there is only one tab we move the window.
 *
 *
 * 3. If we dont receive a screenX & screenY position, we create a new tabgroup + tab at the app windows existing position.
 *
 * @param tabService The service itself which holds the tab groups
 * @param message Application or tab to be ejected
 */
export async function ejectTab(tabService: TabService, message: TabIdentifier&TabWindowOptions, tabGroup?: TabGroup|undefined): Promise<void> {
    // Get the tab that was ejected.
    const ejectedTab: Tab|undefined =
        tabGroup ? tabGroup.getTab({name: message.name, uuid: message.uuid}) : tabService.getTab({uuid: message.uuid, name: message.name});

    // if the tab is not valid then return out of here!
    if (!ejectedTab) {
        return;
    }

    // Default result is null (no window)
    let isOverTabWindowResult: TabGroup|null = null;

    // If we have a screenX & screenY we check if there is a tab group + tab window underneath
    if (message.screenX && message.screenY) {
        isOverTabWindowResult = await tabService.isPointOverTabGroup(message.screenX, message.screenY);
    }

    // If there is a window underneath our point
    if (isOverTabWindowResult) {
        // If the window underneath our point is not the group we're ejecting from.
        if (isOverTabWindowResult !== ejectedTab.tabGroup) {
            // If the window underneath our point has the same URL as the ejecting group
            if (isOverTabWindowResult.window.initialWindowOptions.url === ejectedTab.tabGroup.window.initialWindowOptions.url) {
                // Remove the tab from the ejecting group
                await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);

                // Add the tab to the window underneath our point
                const tab = await isOverTabWindowResult.addTab({tabID: ejectedTab.ID});

                if (!tab) {
                    console.error('Tab was not added');
                    return;
                }

                // Align the app window to the new tab group (window underneath)
                await tab.window.alignPositionToTabGroup();

                // Switch to the added tab in the new group to show the proper window
                isOverTabWindowResult.switchTab(ejectedTab.ID);
            } else {
                // If we the two group URLs dont match then we dont allow tabbing!
                console.warn('Cannot tab - mismatched group Urls!');
            }
        }
    } else {
        // If we have no window underneath our point...

        // Get the original options for the ejecting group (URL, height, etc) to be used for the new tab group.
        const originalOptions = ejectedTab.tabGroup.window.initialWindowOptions;

        // Get the bounds of the ejecting tabgroup
        const [tabGroupBounds] = await Promise.all([ejectedTab.tabGroup.window.getWindowBounds()]);

        // If we have a screenX & screen (but no window undearneath, obviously)
        if (message.screenX && message.screenY) {
            // If our ejecting tab is the last one in the tab group
            if (ejectedTab.tabGroup.tabs.length === 1) {
                // We just move the window instead of reinitializing
                ejectedTab.tabGroup.window.moveTo(message.screenX, message.screenY);
            } else {
                // If there are other tabs in the ejecting tab group

                // Remove the tab
                await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);

                // Reinitialize a new tab group + tab using the ejecting groups options
                initializeTabbing(
                    {url: originalOptions.url, height: originalOptions.height, width: tabGroupBounds.width, screenX: message.screenX, screenY: message.screenY},
                    ejectedTab.ID.uuid,
                    ejectedTab.ID.name,
                    tabService);
            }
        } else {
            // If we have no screenX & screenY and no window underneath (obviously...)

            // Remove the tab from the ejecting group
            await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);

            // Reinitialize the tab at the app windows existing location
            initializeTabbing(
                {url: originalOptions.url, height: originalOptions.height, width: tabGroupBounds.width}, ejectedTab.ID.uuid, ejectedTab.ID.name, tabService);
        }
    }
}

/**
 * Creates a new tab group and adds a tab to it.
 * @param message Tab window options
 * @param uuid the uuid of the application to add as a tab
 * @param name the name of the application to add as a tab
 * @param tabService The tab service
 */
export async function initializeTabbing(message: TabWindowOptions, uuid: string, name: string, tabService: TabService): Promise<void> {
    if (tabService.getTabGroupByApp({name, uuid})) {
        console.error('This window has already been initialised with a tab', {name, uuid});
        return;
    }

    const group: TabGroup = await tabService.addTabGroup(message);
    const tab: Tab | undefined = await group.addTab({ tabID: { uuid, name } }, false, false);

    if (!tab) {
        console.error('No tab was added');
        return;
    }

    if (message.screenX && message.screenY) {
        // if we are provided coords then we tab group is created at them so we need to bring the app window to group.
        await tab.window.alignPositionToTabGroup();
    } else {
        // if no coords then its safe to assume we need to move group window to app window.
        await group.window.alignPositionToApp(tab.window);
    }

    // shows the tab group window because it is default hidden
    group.window.finWindow.show();

    // Switch tab on group to make our added tab the active one
    group.switchTab({uuid, name});
}

/**
 * Takes a tabblob and restores windows based on the blob
 * @function createTabGroupsFromMultipleWindows
 * @param tabBlob[] Restoration data
 */
export async function createTabGroupsFromMultipleWindows(tabBlob: TabBlob[]): Promise<void> {
    if (!tabBlob) {
        console.error('No tab blob supplied');
        return;
    }

    for (const blob of tabBlob) {
        const newTabWindowOptions: TabWindowOptions = {
            url: blob.groupInfo.url,
            screenX: blob.groupInfo.dimensions.x,
            screenY: blob.groupInfo.dimensions.y,
            height: blob.groupInfo.dimensions.tabGroupHeight,
            width: blob.groupInfo.dimensions.width,
        };

        // Create new tabgroup
        const group: TabGroup = await TabService.INSTANCE.addTabGroup(newTabWindowOptions);

        for (const tab of blob.tabs) {
            const existingTab: Tab|undefined = TabService.INSTANCE.getTab({uuid: tab.uuid, name: tab.name});

            if (existingTab) {
                await existingTab.tabGroup.removeTab(existingTab.ID, false, true);
            }

            const newTab: Tab|undefined = await group.addTab({tabID: {uuid: tab.uuid, name: tab.name}});

            if (!newTab) {
                console.error('No tab was added');
                return;
            }

            if (blob.groupInfo.dimensions.x && blob.groupInfo.dimensions.y) {
                // if we are provided coords then we tab group is created at them so we need to bring the app window to group.
                await newTab.window.alignPositionToTabGroup();
            } else {
                // if no coords then its safe to assume we need to move group window to app window.
                await group.window.alignPositionToApp(newTab.window);
            }
        }

        group.window.finWindow.show();
        group.switchTab({uuid: blob.groupInfo.active.uuid, name: blob.groupInfo.active.uuid});
    }
}

(window as Window & {createTabGroupsFromMultipleWindows: Function}).createTabGroupsFromMultipleWindows = createTabGroupsFromMultipleWindows;

/**
 * Creates a UUIDv4() ID
 * Sourced from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
export function uuidv4(): string {
    //@ts-ignore Black Magic
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}
