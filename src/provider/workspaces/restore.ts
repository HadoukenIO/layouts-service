import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../snapanddock/utils/async';
import {Layout, LayoutApp, LayoutName, WindowState} from '../../client/types';

import {regroupLayout} from './group';
import {providerChannel} from '../main';
import {createAppPlaceholders, isClientConnection, positionWindow, wasCreatedProgrammatically} from './utils';

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

export const restoreLayout = async(payload: Layout, identity: Identity): Promise<Layout> => {
    
    // Guards against invalid layout objects (since we are receiving them over the service bus, this is in theory possible)
    // These allow us to return sensible error messages back to the consumer
    if (!payload) { 
        throw new Error ('Received invalid layout object');
    }
    if (!payload.apps) {
        throw new Error('Received invalid layout object: layout.apps is undefined');
    }
    if (!payload.monitorInfo) {
        throw new Error('Received invalid layout object: layout.monitorInfo is undefined');
    }

    const layout = payload;
    const startupApps: Promise<LayoutApp>[] = [];
    console.log('Restoring layout:', layout);
    const apps = await promiseMap(layout.apps, async(app: LayoutApp): Promise<LayoutApp> => {
        // Get rid of childWindows for default response (anything else?)
        const defaultResponse = {...app, childWindows: []};
        try {
            const {uuid} = app;
            console.log('Restoring App:', app);
            const ofApp = await fin.Application.wrap({uuid});
            const isRunning = await ofApp.isRunning();
            if (isRunning) {
                if (isClientConnection(app)) {
                    // CREATE CHILD WINDOW PLACEHOLDER IMAGES???
                    await positionWindow(app.mainWindow);
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
                console.log('App is not running:', app);
                await createAppPlaceholders(app);

                // App is not running - setup communication to fire once app is started
                if (app.confirmed) {
                    startupApps.push(new Promise((resolve: (layoutApp: LayoutApp) => void) => {
                        setAppToRestore(app, resolve);
                    }));
                }
                // Start App
                if (app.manifestUrl) {
                    const {manifestUrl} = app;
                    // Started from manifest
                    console.log('App has manifestUrl:', app);
                    // v2 api broken - below is messy but should be replaced with v2 (can just await create and run below w/ v2)

                    // ofApp = await fin.Application.createFromManifest(manifestUrl);
                    // SHOULD PROBABLY TRY TO CREATE AND RUN FIRST, THEN TRY TO RUN IF GET ERROR
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
                        }, (e: Error) => console.error('Create from manifest error:', e));
                    };

                    runV1(v1App, notInCoreState);
                } else {
                    // Application created programmatically
                    if (wasCreatedProgrammatically(app)) {
                        console.warn('App created programmatically, app may not restart again:', app);
                        ofApp = await fin.Application.create(app.initialOptions);
                    } else {
                        console.error('Unable to restart programmatically launched app:', app);
                    }
                }
                if (ofApp) {
                    await ofApp.run().catch(console.log);
                    await positionWindow(app.mainWindow);
                }
                // SHOULD WE RETURN DEFAULT RESPONSE HERE?!?
                return defaultResponse;
            }
        } catch (e) {
            console.error('Error restoring app', app, e);
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
