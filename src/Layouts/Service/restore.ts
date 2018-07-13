import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../../SnapAndDock/Service/utils/async';
import {Layout, LayoutApp, LayoutName, WindowState} from '../types';

import {regroupLayout} from './group';
import {providerChannel} from './main';
import {flexibleGetLayout} from './storage';
import {createAppPlaceholders, isClientConnection, positionWindow} from './utils';

/*tslint:disable-next-line:no-any*/
declare var fin: any;
const appsToRestore = new Map();

interface AppToRestore {
    layoutApp: LayoutApp;
    resolve: Function;
}

const setAppToRestore = (layoutApp: LayoutApp, resolve: Function): void => {
    const {uuid} = layoutApp;
    const save = {layoutApp, resolve};
    appsToRestore.set(uuid, save);
};

export const getAppToRestore = (uuid: string): AppToRestore => {
    return appsToRestore.get(uuid);
};

export const restoreApplication = async(layoutApp: LayoutApp, resolve: Function): Promise<void> => {
    const {uuid} = layoutApp;
    const defaultResponse: LayoutApp = {...layoutApp, childWindows: []};
    const identity = {uuid, name: uuid};
    const responseAppLayout: LayoutApp|false = await providerChannel.dispatch(identity, 'restoreApp', layoutApp);
    if (responseAppLayout) {
        resolve(responseAppLayout);
    } else {
        resolve(defaultResponse);
    }
    appsToRestore.delete(uuid);
};

export const restoreLayout = async(payload: LayoutName|Layout, identity: Identity): Promise<Layout> => {
    const layout = await flexibleGetLayout(payload);
    const startupApps: Promise<LayoutApp>[] = [];
    console.log('Restoring layout:', layout);
    const apps = await promiseMap(layout.apps, async(app: LayoutApp): Promise<LayoutApp> => {
        // get rid of childWindows (anything else?)
        const defaultResponse = {...app, childWindows: []};
        const {uuid} = app;
        console.log('Restoring App:', app);
        const ofApp = await fin.Application.wrap({uuid});
        const isRunning = await ofApp.isRunning();
        if (isRunning) {
            if (isClientConnection(app)) {
                await positionWindow(app.mainWindow);
                // Check for child windows and create placeholders????????????
                console.log('App is running:', app);
                // Send LayoutApp to connected application so it can handle child WIndows
                const response: LayoutApp|false = await providerChannel.dispatch({uuid, name: uuid}, 'restoreApp', app);
                console.log('Response from restore:', response);
                return response ? response : defaultResponse;
            } else {
                // Not connected to service
                await positionWindow(app.mainWindow);
                return defaultResponse;
            }
        } else {
            let ofApp: undefined|Application;
            // createAppPlaceholders(app);

            // App is not running - setup communication to fire once app is started
            if (app.confirmed) {
                console.log('App is not running:', app);
                startupApps.push(new Promise((resolve: (layoutApp: LayoutApp) => void) => {
                    setAppToRestore(app, resolve);
                }));
            }
            // Start App
            const {manifest, manifestUrl} = app;
            if (typeof manifest === 'object' && manifest.startup_app && manifest.startup_app.uuid === uuid) {
                // Started from manifest
                if (manifestUrl) {
                    console.log('App has manifestUrl:', app);
                    // v2 api broken - below is messy but should be replaced with v2 (can just await create and run below w/ v2)
                    // ofApp = await fin.Application.createFromManifest(manifestUrl);
                    const v1App = fin.desktop.Application.wrap(app.uuid);
                    const runV1 = (v1App: fin.OpenFinApplication, errCb?: Function) => {
                        const defaultErrCb = () => console.error('App Run error');
                        const errorCallback = errCb || defaultErrCb;
                        v1App.run(() => {
                            console.log('Running App created from manifest:', app);
                            positionWindow(app.mainWindow);
                        }, () => errorCallback(app));
                    };

                    const notInCoreState = (app: LayoutApp) => {
                        fin.desktop.Application.createFromManifest(app.manifestUrl, (v1App: fin.OpenFinApplication) => {
                            console.log('Created from manifest:', v1App);
                            runV1(v1App);
                        }, (e?: Error) => console.error('Create from manifest error:', e));
                    };

                    runV1(v1App, notInCoreState);

                } else {
                    // Have app manifest but not a mannifest Url (Is this possible???)
                    console.warn('No manifest URL, app may not restart again:', app);
                    ofApp = await fin.Application.create(app.manifest.startup_app);
                }
            } else {
                // Application created programatically
                ofApp = await fin.Application.create(app.initialOptions);
            }
            if (ofApp) {
                await ofApp.run().catch(console.log);
                await positionWindow(app.mainWindow);
            }
            return defaultResponse;
        }
    });
    // Wait for all apps to startup
    const startupResponses = await Promise.all(startupApps);
    // Consolidate application responses
    const allAppResponses = apps.map(app => {
        const appResponse = startupResponses.find(appRes => appRes.uuid === app.uuid);
        return appResponse ? appResponse : app;
    });
    layout.apps = allAppResponses;
    // Regroup the windows
    await regroupLayout(allAppResponses).catch(console.log);
    // send the layout back to the requester of the restore
    return layout;
};
