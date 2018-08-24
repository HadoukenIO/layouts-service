import {Window} from 'hadouken-js-adapter';
import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../snapanddock/utils/async';
import {Layout, LayoutApp, WindowState} from '../../client/types';

import {getGroup} from './group';
import {providerChannel} from '../main';
import {isClientConnection, showingWindowInApp, wasCreatedFromManifest, wasCreatedProgrammatically} from './utils';

// tslint:disable-next-line:no-any
declare var fin: any;
let layoutId = 1;

export const getCurrentLayout = async(): Promise<Layout> => {
    console.log('get current layout');

    // Not yet using monitor info
    const monitorInfo = await fin.System.getMonitorInfo() || {};

    const apps = await fin.System.getAllWindows();
    console.log('Apps:', apps);
    let layoutApps = await promiseMap(apps, async (app: LayoutApp) => {
        try {
            const {uuid} = app;
            const ofApp = await fin.Application.wrap({uuid});

            // If not running or showing, not part of layout
            const isRunning = await ofApp.isRunning();
            const hasMainWindow = !!app.mainWindow.name;
            const isService = app.uuid === fin.desktop.Application.getCurrent().uuid;
            const isShowing = await showingWindowInApp(app);
            if (!hasMainWindow || !isRunning || isService || !isShowing) {
                return null;
            }

            const appInfo = await ofApp.getInfo().catch((e: Error) => {
                console.log('Appinfo Error', e);
                return {};
            });

            const mainOfWin = await ofApp.getWindow();
            const mainWindowLayoutData = await getLayoutWindowData(mainOfWin);

            app.mainWindow = {...app.mainWindow, ...mainWindowLayoutData};
            app.childWindows = await promiseMap(app.childWindows, async (win: WindowState) => {
                const {name} = win;
                const ofWin = await fin.Window.wrap({uuid, name});
                const windowLayoutData = await getLayoutWindowData(ofWin);

                return {...win, ...windowLayoutData};
            });
            if (wasCreatedFromManifest(appInfo, uuid)) {
                delete appInfo.manifest;
                return { ...app, ...appInfo, uuid, confirmed: false };
            } else if (wasCreatedProgrammatically(appInfo)) {
                delete appInfo.manifest;
                delete appInfo.manifestUrl;
                return { ...app, ...appInfo, uuid, confirmed: false };
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

    const layoutName = 'layout' + layoutId++;
    const layoutObject = {type: 'layout', name: layoutName, apps: layoutApps, monitorInfo};
    return layoutObject;
};

// No payload. Just returns the current layout with child windows.
export const generateLayout = async(payload: null, identity: Identity): Promise<Layout> => {
    const preLayout = await getCurrentLayout();

    const apps = await promiseMap(preLayout.apps, async (app: LayoutApp) => {
        const defaultResponse = {...app, childWindows: []};
        if (isClientConnection(app)) {
            console.log('Connected application', app.uuid);

            // HOW TO DEAL WITH HUNG REQUEST HERE? RESHAPE IF GET NOTHING BACK?
            let updatedAppOptions = await providerChannel.dispatch({uuid: app.uuid, name: app.uuid}, 'savingLayout', app);
            if (!updatedAppOptions) {
                // How to not be included in layout???
                updatedAppOptions = defaultResponse;
            }
            updatedAppOptions.confirmed = true;
            return updatedAppOptions;
        } else {
            return defaultResponse;
        }
    });

    const confirmedLayout = {...preLayout, apps};
    console.log("confirmedLayout", confirmedLayout);
    return confirmedLayout;
};

const getLayoutWindowData = async (ofWin: Window) => {
    const {uuid} = ofWin.identity;
    const info = await ofWin.getInfo();
    const windowGroup = await getGroup(ofWin.identity);
    return {contextGroups: [], info, uuid, windowGroup};
};
