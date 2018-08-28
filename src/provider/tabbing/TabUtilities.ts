import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {TabBlob, TabIdentifier, TabWindowOptions} from '../../client/types';
import {SnapService} from '../snapanddock/SnapService';
import {SnapWindow, WindowState} from '../snapanddock/SnapWindow';
import {Point} from '../snapanddock/utils/PointUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';

import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';
import {ZIndexer} from './ZIndexer';

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
export async function ejectTab(message: TabIdentifier & TabWindowOptions, tabGroup?: TabGroup | undefined) {
    const tabService: TabService = TabService.INSTANCE;

    // Get the tab that was ejected.
    const ejectedTab: Tab|undefined =
        tabGroup ? tabGroup.getTab({name: message.name, uuid: message.uuid}) : tabService.getTab({uuid: message.uuid, name: message.name});

    // if the tab is not valid then return out of here!
    if (!ejectedTab) {
        return Promise.reject('No tab in group?');
    }

    // Default result is null (no window)
    let isOverTabWindowResult: TabIdentifier|null = null;

    // If we have a screenX & screenY we check if there is a tab group + tab window underneath
    if (message.screenX && message.screenY) {
        isOverTabWindowResult =
            getWindowAt(message.screenX, message.screenY /*, ejectedTab.ID*/);  // await tabService.isPointOverTabGroup(message.screenX, message.screenY);
    }

    // If there is a window underneath our point
    if (isOverTabWindowResult && tabService.getTabGroupByApp(isOverTabWindowResult) === tabGroup) {
        // If the window under our point is in the same group as the one being dragged, we do nothing
        return;
    } else if (isOverTabWindowResult) {
        const isOverTabGroup = tabService.getTabGroupByApp(isOverTabWindowResult);
        if (tabService.applicationConfigManager.compareConfigBetweenApplications(isOverTabWindowResult.uuid, ejectedTab.ID.uuid)) {
            if (isOverTabGroup) {
                if (isOverTabGroup.ID !== ejectedTab.tabGroup.ID) {
                    await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);
                    await isOverTabGroup.addTab({tabID: ejectedTab.ID});
                }
            } else {
                await tabService.createTabGroupWithTabs([isOverTabWindowResult, ejectedTab.ID]);
            }
        }
    } else {
        await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);

        if (message.screenX && message.screenY) {
            ejectedTab.window.moveTo(message.screenX!, message.screenY!);
            ejectedTab.window.show();
            return;
        }

        const bounds = await ejectedTab.window.getWindowBounds();

        ejectedTab.window.moveTo(bounds.left, bounds.top);
        ejectedTab.window.show();
        return;
    }

    return;
}


/**
 * Takes a tabblob and restores windows based on the blob
 * @function createTabGroupsFromMultipleWindows
 * @param tabBlob[] Restoration data
 */
export async function createTabGroupsFromTabBlob(tabBlob: TabBlob[]): Promise<void> {
    if (!tabBlob) {
        return Promise.reject('No tab blob supplied');
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

            const newTab: Tab|undefined = await group.addTab({tabID: {uuid: tab.uuid, name: tab.name}}, false, false);

            if (!newTab) {
                console.error('No tab was added');
                return;
            }
        }

        await group.realignApps();
        await group.switchTab({uuid: blob.groupInfo.active.uuid, name: blob.groupInfo.active.uuid});
    }
}

(window as Window & {createTabGroupsFromMultipleWindows: Function}).createTabGroupsFromMultipleWindows = createTabGroupsFromTabBlob;

/**
 * Creates a UUIDv4() ID
 * Sourced from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
export function uuidv4(): string {
    //@ts-ignore Black Magic
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}

/**
 * Finds a window at a specific coordinate.
 * @param {number} x Screen X Coord
 * @param {number} y Screen Y Coord
 * @param {Identity} exclude Window to exclude from the search
 */
export function getWindowAt(x: number, y: number, exclude?: Identity) {
    const point: Point = {x, y};
    const id = exclude ? `${exclude.uuid}/${exclude.name}` : null;
    const windows: SnapWindow[] = (window as Window & {snapService: SnapService}).snapService['windows'];
    const windowsAtPoint: SnapWindow[] = windows.filter((window: SnapWindow) => {
        const state: WindowState = window.getState();

        // Hack to deal with tabstrips being unknown to the snapservice
        const tabGroup = TabService.INSTANCE.getTabGroupByApp(window.getIdentity());
        if (tabGroup) {
            state.center = {x: state.center.x, y: state.center.y - 30};
            state.halfSize = {x: state.halfSize.x, y: state.halfSize.y + 15};
        }

        return window.getId() !== id && !window.getState().hidden && RectUtils.isPointInRect(state.center, state.halfSize, point);
    });



    const sortedWindows: TabIdentifier[]|null = ZIndexer.INSTANCE.getTop(windowsAtPoint.map(window => window.getIdentity()));

    return (sortedWindows && sortedWindows[0]) || null;
}
/**
 * Checks and Compares two UUIDs to see if they have compatible UIs for tabbing.
 * @param uuid1 First UUID to Compare
 * @param uuid2 Second UUId to Compare
 */
export function compareTabGroupUIs(uuid1: string, uuid2: string): boolean {
    const uuid1Config = TabService.INSTANCE.applicationConfigManager.getApplicationUIConfig(uuid1);
    const uuid2Config = TabService.INSTANCE.applicationConfigManager.getApplicationUIConfig(uuid2);

    return ((uuid1Config && uuid2Config && uuid1Config.url === uuid2Config.url) || (!uuid1Config && !uuid2Config));
}