import {Window} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {WindowDetail, WindowInfo} from 'hadouken-js-adapter/out/types/src/api/system/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {CustomData, Layout, LayoutApp, LayoutWindowData, WindowState, TabIdentifier, TabBlob} from '../../client/types';
import {WindowIdentity} from '../snapanddock/SnapWindow';
import {promiseMap} from '../snapanddock/utils/async';
import {getTabSaveInfo} from '../tabbing/SaveAndRestoreAPI';

import {getGroup} from './group';
import {isClientConnection, sendToClient, wasCreatedFromManifest, wasCreatedProgrammatically} from './utils';

export interface WindowObject {
    [uuid: string]: {[name: string]: boolean};
}

export function inWindowObject(win: {uuid: string, name: string}, windowObject: WindowObject) {
    if (windowObject[win.uuid]) {
        if (windowObject[win.uuid][win.name]) {
            return true;
        }
    }
    return false;
}

const deregisteredWindows: WindowObject = {};

export const deregisterWindow = (identity: WindowIdentity) => {
    deregisteredWindows[identity.uuid] = Object.assign({}, deregisteredWindows[identity.uuid], {[identity.uuid]: true});
};

export const getCurrentLayout = async(): Promise<Layout> => {
    // Not yet using monitor info
    const monitorInfo = await fin.System.getMonitorInfo() || {};
    let tabGroups = await getTabSaveInfo();
    const tabbedWindows: {[uuid: string]: {[name: string]: boolean}} = {};

    if (tabGroups === undefined) {
        tabGroups = [];
    }

    
    // Filter out tabGroups with deregistered parents.
    const filteredTabGroups: TabBlob[] = [];

    tabGroups.forEach((tabGroup) => {
        const filteredTabs: TabIdentifier[] = [];
        let activeWindowRemoved = false;

        tabGroup.tabs.forEach(tabWindow => {
            const parentIsDeregistered = inWindowObject({uuid: tabWindow.uuid, name: tabWindow.uuid}, deregisteredWindows);
            const windowIsDeregistered = inWindowObject(tabWindow, deregisteredWindows);

            if (parentIsDeregistered || windowIsDeregistered) {
                if (tabGroup.groupInfo.active.uuid === tabWindow.uuid && tabGroup.groupInfo.active.name === tabWindow.name) {
                    activeWindowRemoved = true;
                }
            } else {
                filteredTabs.push(tabWindow);
            }
        });

        if (filteredTabs.length > 1) {
            if (activeWindowRemoved) {
                tabGroup.groupInfo.active = filteredTabs[0];
            }
            filteredTabGroups.push({groupInfo: tabGroup.groupInfo, tabs: filteredTabs});
        }
    });

    tabGroups.forEach((tabGroup) => {
        tabGroup.tabs.forEach(tabWindow => {
            tabbedWindows[tabWindow.uuid] = Object.assign({}, tabbedWindows[tabWindow.uuid], {[tabWindow.name]: true});
        });
    });

    const apps = await fin.System.getAllWindows();
    const layoutApps = await promiseMap<WindowInfo, LayoutApp|null>(apps, async (windowInfo: WindowInfo) => {
        try {
            const {uuid} = windowInfo;
            const ofApp = await fin.Application.wrap({uuid});

            // If not running, or is service, or is deregistered, not part of layout
            const isRunning = await ofApp.isRunning();
            const hasMainWindow = !!windowInfo.mainWindow.name;
            const isDeregistered = inWindowObject({uuid, name: windowInfo.mainWindow.name}, deregisteredWindows);
            const isService = uuid === fin.desktop.Application.getCurrent().uuid;
            if (!hasMainWindow || !isRunning || isService || isDeregistered) {
                // Not enough info returned for us to restore this app
                return null;
            }

            const appInfo: ApplicationInfo = await ofApp.getInfo().catch((e: Error) => {
                console.log('Appinfo Error', e);
                return {} as ApplicationInfo;
            });

            const mainOfWin: Window = await ofApp.getWindow();
            const mainWindowLayoutData = await getLayoutWindowData(mainOfWin, tabbedWindows);

            const mainWindow: WindowState = {...windowInfo.mainWindow, ...mainWindowLayoutData};

            // Filter for deregistered child windows
            windowInfo.childWindows = windowInfo.childWindows.filter((win: WindowDetail) => {
                const isDeregistered = inWindowObject({uuid, name: win.name}, deregisteredWindows);
                if (isDeregistered) {
                    return false;
                }
                return true;
            });

            const childWindows: WindowState[] = await promiseMap(windowInfo.childWindows, async (win: WindowDetail) => {
                const {name} = win;
                const ofWin = await fin.Window.wrap({uuid, name});
                const windowLayoutData = await getLayoutWindowData(ofWin, tabbedWindows);

                return {...win, ...windowLayoutData};
            });
            if (wasCreatedFromManifest(appInfo, uuid)) {
                delete appInfo.manifest;
                return {mainWindow, childWindows, ...appInfo, uuid, confirmed: false};
            } else if (wasCreatedProgrammatically(appInfo)) {
                delete appInfo.manifest;
                delete appInfo.manifestUrl;
                return {mainWindow, childWindows, ...appInfo, uuid, confirmed: false};
            } else {
                console.error('Not saving app, cannot restore:', windowInfo);
                return null;
            }
        } catch (e) {
            console.error('Error adding app to layout', windowInfo, e);
            return null;
        }
    });
    const validApps: LayoutApp[] = layoutApps.filter((a): a is LayoutApp => !!a);
    console.log('Pre-Layout Save Apps:', apps);

    const layoutObject: Layout = {type: 'layout', apps: validApps, monitorInfo, tabGroups: filteredTabGroups};
    return layoutObject;
};

// No payload. Just returns the current layout with child windows.
export const generateLayout = async(payload: null, identity: Identity): Promise<Layout> => {
    const preLayout = await getCurrentLayout();

    const apps = await promiseMap(preLayout.apps, async (app: LayoutApp) => {
        const defaultResponse = {...app};
        if (isClientConnection(app)) {
            console.log('Connected application', app.uuid);

            // HOW TO DEAL WITH HUNG REQUEST HERE? RESHAPE IF GET NOTHING BACK?
            let customData: CustomData = undefined;
            await sendToClient(app, 'savingLayout', app);

            if (!customData) {
                customData = null;
            }
            defaultResponse.customData = customData;
            defaultResponse.confirmed = true;
            return defaultResponse;
        } else {
            return defaultResponse;
        }
    });

    const confirmedLayout = {...preLayout, apps};
    return confirmedLayout;
};


function inTabbedWindowsObject(win: Identity, tabbedWindows: {[uuid: string]: {[name: string]: boolean}}) {
    if (win.name) {
        if (tabbedWindows[win.uuid]) {
            if (tabbedWindows[win.uuid][win.name]) {
                return true;
            }
        }
    }

    return false;
}

const getLayoutWindowData = async(ofWin: Window, tabbedWindows: {[uuid: string]: {[name: string]: boolean}}): Promise<LayoutWindowData> => {
    const {uuid} = ofWin.identity;
    const info = await ofWin.getInfo();
    const windowGroup = await getGroup(ofWin.identity);
    let isTabbed = false;
    if (inTabbedWindowsObject(ofWin.identity, tabbedWindows)) {
        isTabbed = true;
    }

    const options = await ofWin.getOptions();
    const isShowing: boolean = await ofWin.isShowing();
    return {info, uuid, windowGroup, frame: options.frame, state: options.state, isTabbed, isShowing};
};
