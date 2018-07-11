import {Window} from 'hadouken-js-adapter';
import Fin from 'hadouken-js-adapter/out/types/src/api/fin';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../../SnapAndDock/Service/utils/async';
import {Layout, LayoutApp, LayoutName, WindowState} from '../types';

import {getGroup} from './group';
import {providerChannel} from './index';
import {saveLayout} from './storage';
import {isClientConnection} from './utils';

// tslint:disable-next-line:no-any
declare var fin: any;
let layoutId = 1;

export const getCurrentLayout = async(): Promise<Layout> => {
    console.log('get cur layout....');

    // taking off monitorinfo for now for dbugging purposes...
    // const monitorInfo = fin.System.getMonitorInfo();
    const monitorInfo = {};

    let apps = await fin.System.getAllWindows();
    apps = apps.filter((a: LayoutApp) => a.uuid !== fin.desktop.Application.getCurrent().uuid);
    console.log('apps', apps);
    const layoutApps = await promiseMap(apps, async (app: LayoutApp) => {
        const {uuid} = app;
        // let parentUuid;
        const ofApp = await fin.Application.wrap({uuid});
        const mainWindowInfo = await ofApp.getWindow().then((win: Window) => win.getInfo());

        const appInfo = await ofApp.getInfo().catch((e: Error) => {
            console.log('Appinfo Error', e);
            return {};
        });

        const mainWindowGroup = await getGroup({uuid, name: uuid});

        const image = await ofApp.getWindow().then((win: Window) => win.getSnapshot());

        app.mainWindow = {...app.mainWindow, windowGroup: mainWindowGroup, info: mainWindowInfo, uuid, contextGroups: [], image};
        app.childWindows = await promiseMap(app.childWindows, async (win: WindowState) => {
            const {name} = win;
            const windowGroup = await getGroup({uuid, name});
            const ofWin = await fin.Window.wrap({uuid, name});

            const info = await ofWin.getInfo();
            const image = await ofWin.getSnapshot();

            return {...win, windowGroup, info, uuid, contextGroups: [], image};
        });
        return {...app, ...appInfo, uuid, confirmed: false};
    });
    const layoutName = 'layout' + layoutId++;
    const layoutObject = {type: 'layout', name: layoutName, apps: layoutApps, monitorInfo};
    return layoutObject;
};

// tslint:disable-next-line:no-any
export const createLayout = async(layoutName: LayoutName, opts?: any): Promise<Layout> => {
    // TODO: figure out how to actually make options work.... optoins not being used right now
    const currentLayout = await getCurrentLayout();
    const options = opts || {};
    const layout = {...currentLayout, ...options, name: layoutName};
    saveLayout(layout);
    return layout;
};

// payload eventually could be a layout... for now just a name to set current layout
export const setLayout = async(payload: LayoutName, identity: Identity): Promise<Layout> => {
    // FIX THIS SHAPE - only a string for now....
    const preLayout = await createLayout(payload);

    const apps = await promiseMap(preLayout.apps, async (app: LayoutApp) => {
        const defaultResponse = {...app, childWindows: []};
        if (isClientConnection(app)) {
            console.log('Connected application', app.uuid);

            // HOW TO DEAL WITH HUNG REQUEST HERE? RESHAPE IF GET NOTHING BACK?
            let updatedAppOptions = await providerChannel.dispatch({uuid: app.uuid, name: app.uuid}, 'savingLayout', app);
            if (!updatedAppOptions) {
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