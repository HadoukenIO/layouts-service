/*tslint:disable:no-any*/
import { promiseMap } from '../../SnapAndDock/Service/utils/async';
import { Layout, LayoutApp, LayoutName, Url, WindowState } from '../types';
import { Identity } from 'hadouken-js-adapter/out/types/src/identity';
import { Window } from 'hadouken-js-adapter';
import { getGroup } from './group';
import { saveLayout } from './storage';
import { isClientConnection } from './utils';
import { providerChannel } from './index';

declare var fin: any;
let layoutId = 1;

export const getCurrentLayout = async (): Promise<Layout> => {
    console.log('get cur layout....');

    // taking off monitorinfo for now for dbugging purposes...
    // const monitorInfo = fin.System.getMonitorInfo();  
    const monitorInfo = {};

    let apps = await fin.System.getAllWindows();
    apps = apps.filter((a: any) => a.uuid !== 'Layout-Manager');
    console.log('apps', apps);
    const layoutApps = await promiseMap(apps, async (app: LayoutApp) => {
        const { uuid } = app;
        // let parentUuid;
        const ofApp = await fin.Application.wrap({ uuid });
        console.log('before main win info');
        const mainWindowInfo = await ofApp.getWindow().then((win: Window) => win.getInfo());
        console.log('after main win info');
        // eventually use manifestUrl instead once API call exists
        // const manifest = await ofApp.getManifest().catch(async () => {
        //   // not launched from manifest - get parent UUID and main Window info 
        //   parentUuid = await ofApp.getParentUuid().catch(() => false);
        //   return false;
        // });

        const appInfo = await ofApp.getInfo().catch((e: any) => {
            console.log('appinfo error!!!', e);
            return {};
        });
        console.log('after appinfo', appInfo);

        const mainWindowGroup = await getGroup({ uuid, name: uuid });
        console.log('after main get group');

        const image = await ofApp.getWindow().then((win: Window) => win.getSnapshot());

        app.mainWindow = { ...app.mainWindow, windowGroup: mainWindowGroup, info: mainWindowInfo, uuid, contextGroups: [], image };
        console.log('before child win');
        app.childWindows = await promiseMap(app.childWindows, async (win: WindowState) => {
            const { name } = win;
            const windowGroup = await getGroup({ uuid, name });
            console.log('after group', windowGroup);
            const ofWin = await fin.Window.wrap({ uuid, name });

            const info = await ofWin.getInfo();
            const image = await ofWin.getSnapshot();

            return { ...win, windowGroup, info, uuid, contextGroups: [], image };
        });
        console.log('after child win');
        return { ...app, ...appInfo, uuid, confirmed: false };
    });
    console.log('about to return...');
    const layoutName = 'layout' + layoutId++;
    const layoutObject = { type: 'layout', name: layoutName, apps: layoutApps, monitorInfo };
    return layoutObject;
};

export const createLayout = async (layoutName: LayoutName, opts?: any): Promise<Layout> => {
    // TODO: figure out how to actually make options work.... optoins not being used right now
    const currentLayout = await getCurrentLayout();
    const options = opts || {};
    const layout = { ...currentLayout, ...options, name: layoutName };
    saveLayout(layout);
    // layouts.set(layoutName, layout);
    console.log('lo', layout);
    return layout;
};

// payload eventually could be a layout... for now just a name to set current layout
export const setLayout = async (payload: LayoutName, identity: Identity): Promise<Layout> => {
    // FIX THIS SHAPE - only a string for now.... 
    const preLayout = await createLayout(payload);
    console.log('plo', preLayout);

    const apps = await promiseMap(preLayout.apps, async (app: any) => {
        console.log('app', app);
        const defaultResponse = { ...app, childWindows: [] };
        if (isClientConnection(app)) {
            console.log('matching app', app.uuid);

            // HOW TO DEAL WITH HUNG REQUEST HERE? RESHAPE IF GET NOTHING BACK?
            let updatedAppOptions = await providerChannel.dispatch({ uuid: app.uuid, name: app.uuid }, 'savingLayout', app);
            if (!updatedAppOptions) {
                updatedAppOptions = defaultResponse;
            }
            updatedAppOptions.confirmed = true;
            console.log('before, after', app, updatedAppOptions);
            return updatedAppOptions;
        } else {
            return defaultResponse;
        }
    });

    const confirmedLayout = { ...preLayout, apps };
    saveLayout(confirmedLayout);
    return confirmedLayout;
};