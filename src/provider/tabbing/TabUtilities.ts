import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {ApplicationUIConfig, TabBlob, TabIdentifier, TabWindowOptions} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowState} from '../model/DesktopWindow';
import {SnapService} from '../snapanddock/SnapService';
import {Point} from '../snapanddock/utils/PointUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';

import {Tab} from './Tab';
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
export async function ejectTab(message: TabIdentifier&Partial<TabWindowOptions>, tabGroup?: DesktopTabGroup|undefined) {
    const tabService: TabService = TabService.INSTANCE;

    // Get the tab that was ejected.
    const ejectedTab: Tab|undefined =
        tabGroup ? tabGroup.getTab({name: message.name, uuid: message.uuid}) : tabService.getTab({uuid: message.uuid, name: message.name});

    // if the tab is not valid then return out of here!
    if (!ejectedTab) {
        console.error('Attempted to eject tab which is not in a tabgroup');
        throw new Error('Specified window is not in a tabGroup.');
    }

    // Default result is null (no window)
    let isOverTabWindowResult: TabIdentifier|null = null;

    // If we have a screenX & screenY we check if there is a tab group + tab window underneath
    if (message.x && message.y) {
        isOverTabWindowResult =
            getWindowAt(message.x, message.y /*, ejectedTab.ID*/);  // await tabService.isPointOverTabGroup(message.screenX, message.screenY);
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
                    await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true, true, false);
                    const tab = await new Tab({tabID: ejectedTab.ID}).init();
                    await isOverTabGroup.addTab(tab);
                }
            } else {
                await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true, true, false);
                await TabService.INSTANCE.createTabGroupWithTabs([isOverTabWindowResult, ejectedTab.ID]);
            }
        }
    } else {
        await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, false, true, true);

        if (message.x && message.y) {
            ejectedTab.window.moveTo(message.x, message.y + ejectedTab.tabGroup.config.height);
            ejectedTab.window.show();
        } else {
            const bounds = await ejectedTab.window.getWindowBounds();
            ejectedTab.window.moveTo(bounds.left, bounds.top);
            ejectedTab.window.show();
        }

        if (ejectedTab.tabGroup.tabs.length === 1) {
            tabService.removeTabGroup(ejectedTab.tabGroup.ID, false);
        }
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
        console.error('Unable to create tabgroup - no blob supplied');
        throw new Error('Unable to create tabgroup - no blob supplied');
    }

    // Created tab set will be a stand-alone snap group
    const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();

    for (const blob of tabBlob) {
        const newTabWindowOptions: TabWindowOptions = {
            url: blob.groupInfo.url,
            x: blob.groupInfo.dimensions.x,
            y: blob.groupInfo.dimensions.y,
            height: blob.groupInfo.dimensions.tabGroupHeight,
            width: blob.groupInfo.dimensions.width,
        };


        // Create new tabgroup
        const group: DesktopTabGroup = await TabService.INSTANCE.addTabGroup(snapGroup, newTabWindowOptions);

        group.isRestored = true;

        await new Promise((res, rej) => {
            const win = fin.desktop.Window.wrap(blob.tabs[0].uuid, blob.tabs[0].name);
            win.resizeTo(blob.groupInfo.dimensions.width!, blob.groupInfo.dimensions.appHeight, 'top-left', res, rej);
        });

        for (const tab of blob.tabs) {
            let newTab = await new Tab({tabID: tab}).init();

            newTab = await group.addTab(newTab, false, true);

            if (!newTab) {
                console.error('No tab was added');
                return;
            }
        }

        await group.realignApps();
        await group.switchTab({uuid: blob.groupInfo.active.uuid, name: blob.groupInfo.active.name});
    }

    TabService.INSTANCE.tabGroups.forEach(group => group.realignApps());
}

(window as Window & {createTabGroupsFromTabBlob: Function}).createTabGroupsFromTabBlob = createTabGroupsFromTabBlob;

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
    const windows: DesktopWindow[] = (window as Window & {model: DesktopModel}).model['windows'];
    const windowsAtPoint: DesktopWindow[] = windows.filter((window: DesktopWindow) => {
        const state: WindowState = Object.assign({}, window.getState());

        // Ignore any windows that are snapped (temporary solution - see SERVICE-230/SERVICE-200)
        if (window.getGroup().length > 1) {
            return false;
        }

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