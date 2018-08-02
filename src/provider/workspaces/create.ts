import {Window} from 'hadouken-js-adapter';
import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../snapanddock/utils/async';
import {Layout, LayoutApp, LayoutName, WindowState} from '../../types';

import {getGroup} from './group';
import {providerChannel} from '../main';
import {saveLayout} from './storage';
import {isClientConnection, showingWindowInApp, wasCreatedFromManifest, wasCreatedProgramatically} from './utils';

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
            if (!hasMainWindow || !isRunning || isService || !showingWindowInApp(app)) {
                return null;
            }

            const appInfo = await ofApp.getInfo().catch((e: Error) => {
                console.log('Appinfo Error', e);
                return {};
            });

            // FOR PRE 9.61.33.15
            if (!appInfo.manifest) {
                appInfo.manifest = await ofApp.getManifest().catch(() => undefined);
            }

            const mainOfWin = await ofApp.getWindow();
            const mainWindowLayoutData = await getLayoutWindowData(mainOfWin);

            app.mainWindow = {...app.mainWindow, ...mainWindowLayoutData};
            app.childWindows = await promiseMap(app.childWindows, async (win: WindowState) => {
                const {name} = win;
                const ofWin = await fin.Window.wrap({uuid, name});
                const windowLayoutData = await getLayoutWindowData(ofWin);

                return {...win, ...windowLayoutData};
            });
            if (wasCreatedFromManifest(appInfo, uuid) || wasCreatedProgramatically(appInfo)) {
                return {...app, ...appInfo, uuid, confirmed: false};
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

// tslint:disable-next-line:no-any
export const createLayout = async(layoutName: LayoutName, opts?: any): Promise<Layout> => {
    // may need to rework since only saving current layout & have separate saceLayoutObject
    const currentLayout = await getCurrentLayout();
    const options = opts || {};
    const layout = {...currentLayout, ...options, name: layoutName};
    saveLayout(layout);
    return layout;
};

// payload eventually could be a layout... for now just a name to set current layout
export const saveCurrentLayout = async(payload: LayoutName, identity: Identity): Promise<Layout> => {
    const preLayout = await createLayout(payload);

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
    saveLayout(confirmedLayout);
    return confirmedLayout;
};

export const saveLayoutObject = async(payload: Layout, identity: Identity): Promise<Layout> => {
    // SOME SORT OF VALIDATION HERE???
    saveLayout(payload);
    return payload;
};

const getLayoutWindowData = async (ofWin: Window) => {
    const {uuid} = ofWin.identity;
    const image = await ofWin.getSnapshot();
    // const image = '';
    const info = await ofWin.getInfo();
    const windowGroup = await getGroup(ofWin.identity);
    return {contextGroups: [], image, info, uuid, windowGroup};
};
