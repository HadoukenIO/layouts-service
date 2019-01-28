import {Window} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {WindowDetail, WindowInfo as WindowInfo_System} from 'hadouken-js-adapter/out/types/src/api/system/window';
import {WindowInfo as WindowInfo_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {WorkspaceAPI, LegacyAPI} from '../../client/internal';
import {CustomData, TabGroup, Workspace, WorkspaceApp, WorkspaceWindow} from '../../client/types';
import {apiHandler, model, tabService} from '../main';
import {WindowIdentity} from '../model/DesktopWindow';
import {promiseMap} from '../snapanddock/utils/async';

import {getGroup} from './group';
import {addToWindowObject, inWindowObject, parseVersionString, wasCreatedFromManifest, wasCreatedProgrammatically, WindowObject} from './utils';

// This value should be updated any time changes are made to the layout schema.
// Major version indicates breaking changes.
export const LAYOUTS_SCHEMA_VERSION = '1.0.0';
export const SCHEMA_MAJOR_VERSION = parseVersionString(LAYOUTS_SCHEMA_VERSION).major;

const deregisteredWindows: WindowObject = {};

/**
 * A subset of LayoutWindow, should refactor to remove the need to duplicate this.
 */
interface WorkspaceWindowData {
    uuid: string;
    isShowing: boolean;
    state: 'normal'|'minimized'|'maximized';
    frame: boolean;
    info: WindowInfo_Window;
    windowGroup: Identity[];
    isTabbed: boolean;
}

export const deregisterWindow = (identity: WindowIdentity) => {
    addToWindowObject(identity, deregisteredWindows);
};

export const getCurrentLayout = async(): Promise<Workspace> => {
    // Not yet using monitor info
    const monitorInfo = await fin.System.getMonitorInfo() || {};
    let tabGroups = await tabService.getTabSaveInfo();
    const tabbedWindows: WindowObject = {};

    if (tabGroups === undefined) {
        tabGroups = [];
    }

    // Filter out tabGroups with deregistered parents.
    const filteredTabGroups: TabGroup[] = [];

    tabGroups.forEach((tabGroup: TabGroup) => {
        const filteredTabs: WindowIdentity[] = [];
        let activeWindowRemoved = false;

        tabGroup.tabs.forEach((tabWindow: WindowIdentity) => {
            // Filter tabs out if either the window itself or its parent is deregistered from Save and Restore
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

        // If the active window was removed, set a new window from the group to show
        if (activeWindowRemoved && filteredTabs.length >= 1) {
            const newActiveWindow = filteredTabs[0];
            tabGroup.groupInfo.active = newActiveWindow;
        }

        // If we still have enough windows for a tab group, include it in filteredTabGroups
        if (filteredTabs.length > 1) {
            filteredTabGroups.push({groupInfo: tabGroup.groupInfo, tabs: filteredTabs});
        }
    });

    // Populate the tabbedWindows object for easy lookup
    filteredTabGroups.forEach((tabGroup) => {
        tabGroup.tabs.forEach(tabWindow => {
            addToWindowObject(tabWindow, tabbedWindows);
        });
    });

    const apps = await fin.System.getAllWindows();
    const layoutApps: (WorkspaceApp|null)[] = await promiseMap<WindowInfo_System, WorkspaceApp|null>(apps, async (windowInfo: WindowInfo_System) => {
        try {
            const {uuid} = windowInfo;
            const ofApp = await fin.Application.wrap({uuid});

            // If not running, or is service, or is deregistered, not part of layout
            const isRunning = await ofApp.isRunning();
            const hasMainWindow = !!windowInfo.mainWindow.name;
            const isDeregistered = inWindowObject({uuid, name: windowInfo.mainWindow.name}, deregisteredWindows);
            const isService = uuid === fin.Application.me.uuid;
            if (!hasMainWindow || !isRunning || isService || isDeregistered) {
                // Not enough info returned for us to restore this app
                return null;
            }

            const appInfo: ApplicationInfo = await ofApp.getInfo().catch((e: Error) => {
                console.log('Appinfo Error', e);
                return {} as ApplicationInfo;
            });

            // Grab the layout information for the main app window
            const mainOfWin: Window = await ofApp.getWindow();
            const mainWindowLayoutData = await getLayoutWindowData(mainOfWin, tabbedWindows);
            const mainWindow: WorkspaceWindow = {...windowInfo.mainWindow, ...mainWindowLayoutData};

            // Filter for deregistered child windows
            windowInfo.childWindows = windowInfo.childWindows.filter((win: WindowDetail) => {
                const isDeregistered = inWindowObject({uuid, name: win.name}, deregisteredWindows);
                if (isDeregistered) {
                    return false;
                }
                return true;
            });

            // Grab the layout information for the child windows
            const childWindows: WorkspaceWindow[] = await promiseMap(windowInfo.childWindows, async (win: WindowDetail) => {
                const {name} = win;
                const ofWin = await fin.Window.wrap({uuid, name});
                const windowLayoutData = await getLayoutWindowData(ofWin, tabbedWindows);

                return {...win, ...windowLayoutData};
            });
            if (wasCreatedFromManifest(appInfo, uuid)) {
                delete appInfo.manifest;
                return {mainWindow, childWindows, ...appInfo, uuid, confirmed: false} as WorkspaceApp;
            } else if (wasCreatedProgrammatically(appInfo)) {
                delete appInfo.manifest;
                delete appInfo.manifestUrl;
                return {mainWindow, childWindows, ...appInfo, uuid, confirmed: false} as WorkspaceApp;
            } else {
                console.error('Not saving app, cannot restore:', windowInfo);
                return null;
            }
        } catch (e) {
            console.error('Error adding app to layout', windowInfo, e);
            return null;
        }
    });
    const validApps: WorkspaceApp[] = layoutApps.filter((a): a is WorkspaceApp => !!a);
    console.log('Pre-Layout Save Apps:', apps);
    console.log('Post-Layout Valid Apps:', validApps);

    const layoutObject: Workspace = {type: 'layout', schemaVersion: LAYOUTS_SCHEMA_VERSION, apps: validApps, monitorInfo, tabGroups: filteredTabGroups};

    apiHandler.sendToAll('workspace-saved', layoutObject);

    return layoutObject;
};

// No payload. Just returns the current layout with child windows.
export const generateLayout = async(payload: null, identity: Identity): Promise<Workspace> => {
    const preLayout = await getCurrentLayout();

    const apps = await promiseMap(preLayout.apps, async (app: WorkspaceApp) => {
        const defaultResponse = {...app};
        if (apiHandler.isClientConnection({uuid: app.uuid, name: app.mainWindow.name})) {
            console.log('Connected application', app.uuid);

            // HOW TO DEAL WITH HUNG REQUEST HERE? RESHAPE IF GET NOTHING BACK?
            let customData: CustomData = undefined;

            // Race between legacyAPI and current API as we don't know which verion the client is running.
            customData = await Promise.race([apiHandler.sendToClient<WorkspaceApp, CustomData>({uuid: app.uuid, name: app.uuid}, WorkspaceAPI.SAVE_HANDLER, app), apiHandler.sendToClient<WorkspaceApp, CustomData>({uuid: app.uuid, name: app.uuid}, LegacyAPI.SAVE_HANDLER, app)])

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

// Grabs all of the necessary layout information for a window. Filters by multiple criteria.
const getLayoutWindowData = async(ofWin: Window, tabbedWindows: WindowObject): Promise<WorkspaceWindowData> => {
    const {uuid} = ofWin.identity;
    const identity: WindowIdentity = ofWin.identity as WindowIdentity;
    const info = await ofWin.getInfo();

    const windowGroup = await getGroup(ofWin.identity);
    const filteredWindowGroup: Identity[] = [];
    windowGroup.forEach((windowIdentity) => {
        // Filter window group by checking to see if the window itself or its parent are deregistered. If either of them are, don't include in window group.
        const parentIsDeregistered = inWindowObject({uuid: windowIdentity.uuid, name: windowIdentity.uuid}, deregisteredWindows);
        const windowIsDeregistered = inWindowObject(windowIdentity, deregisteredWindows);
        if (!parentIsDeregistered && !windowIsDeregistered && windowIdentity.uuid !== 'layouts-service') {
            filteredWindowGroup.push(windowIdentity);
        }
    });

    const options = await ofWin.getOptions();
    const desktopWindow = model.getWindow(identity);
    if (desktopWindow === null) {
        throw Error(`No desktop window for window. Name: ${identity.name}, UUID: ${identity.uuid}`);
    }
    const applicationState = desktopWindow.applicationState;

    // If a window is tabbed (based on filtered tabGroups), tab it.
    const isTabbed = inWindowObject(ofWin.identity, tabbedWindows) ? true : false;

    const tmp: WorkspaceWindowData =
        {info, uuid, windowGroup: filteredWindowGroup, frame: applicationState.frame, state: options.state, isTabbed, isShowing: !applicationState.hidden};

    return {info, uuid, windowGroup: filteredWindowGroup, frame: applicationState.frame, state: options.state, isTabbed, isShowing: !applicationState.hidden};
};
