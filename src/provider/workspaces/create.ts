import {Window} from 'hadouken-js-adapter';
import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {CustomData, Layout, LayoutApp, WindowState} from '../../client/types';
import {providerChannel} from '../main';
import {promiseMap} from '../snapanddock/utils/async';
import {getTabSaveInfo} from '../tabbing/SaveAndRestoreAPI';

import {getGroup} from './group';
import {getClientConnection, isClientConnection, wasCreatedFromManifest, wasCreatedProgrammatically, sendToClient} from './utils';
import { WindowInfo } from 'hadouken-js-adapter/out/types/src/api/system/window';
import { ApplicationInfo } from 'hadouken-js-adapter/out/types/src/api/application/application';


export const getCurrentLayout = async(): Promise<Layout> => {
    // Not yet using monitor info
    const monitorInfo = await fin.System.getMonitorInfo() || {};
    let tabGroups = await getTabSaveInfo();
    const tabbedWindows: {[uuid: string]: {[name: string]: boolean}} = {};

    if (tabGroups === undefined) {
        tabGroups = [];
    }

    tabGroups.forEach((tabGroup) => {
        tabGroup.tabs.forEach(tabWindow => {
            tabbedWindows[tabWindow.uuid] = Object.assign({}, tabbedWindows[tabWindow.uuid], {[tabWindow.name]: true});
        });
    });

    const apps = await fin.System.getAllWindows();
    let layoutApps = await promiseMap<WindowInfo, LayoutApp|null>(apps, async (windowInfo: WindowInfo) => {
        const app = windowInfo as LayoutApp;
        const {uuid} = app;
        try {
            const ofApp = await fin.Application.wrap({uuid});

            // If not running or showing, not part of layout
            const isRunning = await ofApp.isRunning();
            const hasMainWindow = !!app.mainWindow.name;
            const isService = app.uuid === fin.desktop.Application.getCurrent().uuid;
            if (!hasMainWindow || !isRunning || isService) {
                return null;
            }

            const appInfo = await ofApp.getInfo().catch((e: Error) => {
                console.log('Appinfo Error', e);
                return {} as ApplicationInfo;
            });

            const mainOfWin = await ofApp.getWindow();
            const mainWindowLayoutData = await getLayoutWindowData(mainOfWin, tabbedWindows);

            app.mainWindow = {...app.mainWindow, ...mainWindowLayoutData};
            app.childWindows = await promiseMap(app.childWindows, async (win: WindowState) => {
                const {name} = win;
                const ofWin = await fin.Window.wrap({uuid, name});
                const windowLayoutData = await getLayoutWindowData(ofWin, tabbedWindows);

                return {...win, ...windowLayoutData};
            });
            if (wasCreatedFromManifest(appInfo, uuid)) {
                delete appInfo.manifest;
                return {...app, ...appInfo, uuid, confirmed: false};
            } else if (wasCreatedProgrammatically(appInfo)) {
                delete appInfo.manifest;
                delete appInfo.manifestUrl;
                return {...app, ...appInfo, uuid, confirmed: false} as LayoutApp;
            } else {
                console.error('Not saving app, cannot restore:', app);
                return null;
            }
        } catch (e) {
            console.error('Error adding app to layout', app, e);
            return null;
        }
    });
    layoutApps = layoutApps.filter(a => !!a);
    console.log('Pre-Layout Save Apps:', apps);

    const layoutObject = {type: 'layout', apps: layoutApps, monitorInfo, tabGroups};
    return layoutObject as Layout;
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

const getLayoutWindowData = async (ofWin: Window, tabbedWindows: {[uuid: string]: {[name: string]: boolean}}) => {
    const {uuid} = ofWin.identity;
    const info = await ofWin.getInfo();
    const windowGroup = await getGroup(ofWin.identity);
    let isTabbed = false;
    if (inTabbedWindowsObject(ofWin.identity, tabbedWindows)) {
        isTabbed = true;
    }

    const frame: boolean = (await ofWin.getOptions()).frame;
    return {info, uuid, windowGroup, frame, isTabbed};
};
