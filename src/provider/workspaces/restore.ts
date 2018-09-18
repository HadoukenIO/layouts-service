import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {Layout, LayoutApp, WindowState} from '../../client/types';
import {providerChannel} from '../main';
import {WindowIdentity} from '../model/DesktopWindow';
import {p, promiseMap} from '../snapanddock/utils/async';
import {TabService} from '../tabbing/TabService';

import {regroupLayout} from './group';
import {createNormalPlaceholder, createTabPlaceholder, getClientConnection, isClientConnection, positionWindow, wasCreatedProgrammatically} from './utils';

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
    const name = uuid;
    const defaultResponse: LayoutApp = {...layoutApp, childWindows: []};
    const appConnection = getClientConnection({uuid, name});
    if (appConnection) {
        const responseAppLayout: LayoutApp|false = await providerChannel.dispatch(appConnection, 'restoreApp', layoutApp);
        if (responseAppLayout) {
            resolve(responseAppLayout);
        } else {
            resolve(defaultResponse);
        }
        appsToRestore.delete(uuid);
    }
};

export const restoreLayout = async(payload: Layout, identity: Identity): Promise<Layout> => {
    // Guards against invalid layout objects (since we are receiving them over the service bus, this is in theory possible)
    // These allow us to return sensible error messages back to the consumer
    if (!payload) {
        throw new Error('Received invalid layout object');
    }
    if (!payload.apps) {
        throw new Error('Received invalid layout object: layout.apps is undefined');
    }
    if (!payload.monitorInfo) {
        throw new Error('Received invalid layout object: layout.monitorInfo is undefined');
    }

    const layout = payload;
    const startupApps: Promise<LayoutApp>[] = [];
    const tabbedWindows: {[uuid: string]: {[name: string]: boolean}} = {};
    const tabbedPlaceholdersToWindows: {[uuid: string]: {[name: string]: WindowIdentity}} = {};

    // Helper function to determine if a window is tabbed.
    function inTabbedWindowsObject(win: {uuid: string, name: string}) {
        if (tabbedWindows[win.uuid]) {
            if (tabbedWindows[win.uuid][win.name]) {
                return true;
            }
        }
        return false;
    }

    // Helper function to determine if a window has a corresponding placeholder.
    function inTabbedPlaceholdersToWindowsObject(win: {uuid: string, name: string}) {
        if (tabbedPlaceholdersToWindows[win.uuid]) {
            if (tabbedPlaceholdersToWindows[win.uuid][win.name]) {
                return true;
            }
        }
        return false;
    }

    // Creates a tabbing placeholder and records the information for its corresponding window.
    async function createTabbedPlaceholderAndRecord(win: WindowState) {
        const tabPlaceholder = await createTabPlaceholder(win);
        tabbedPlaceholdersToWindows[win.uuid] =
            Object.assign({}, tabbedPlaceholdersToWindows[win.uuid], {[win.name]: {name: tabPlaceholder.name, uuid: tabPlaceholder.uuid}});
    }

    // Helper function to determine what type of placeholder window to open.
    async function childWindowPlaceholderCheck(app: LayoutApp) {
        if (app.confirmed) {
            for (const win of app.childWindows) {
                if (inTabbedWindowsObject(win)) {
                    await createTabbedPlaceholderAndRecord(win);
                } else {
                    await createNormalPlaceholder(win);
                }
            }
        } else {
            return;
        }
    }

    // Helper function to determine which placeholder windows to create for a running application's child windows.
    async function childWindowPlaceholderCheckRunningApp(app: LayoutApp) {
        if (app.confirmed) {
            const mainApp = await fin.Application.wrap(app.mainWindow);
            const openChildWindows = await mainApp.getChildWindows();
            for (const win of app.childWindows) {
                // Here we're checking if the incoming child window is already open or not.
                const windowIsOpen = openChildWindows.some((openWin: _Window) => openWin.identity.name === win.name);

                if (!windowIsOpen) {
                    if (inTabbedWindowsObject(win)) {
                        await createTabbedPlaceholderAndRecord(win);
                    } else {
                        await createNormalPlaceholder(win);
                    }
                } else {
                    await TabService.INSTANCE.removeTab(win);
                }
            }
        } else {
            return;
        }
    }

    // Create tabbedWindows list so we don't have to iterate over all of the tabGroup/TabBlob arrays.
    payload.tabGroups.forEach((tabGroup) => {
        tabGroup.tabs.forEach(tabWindow => {
            tabbedWindows[tabWindow.uuid] = Object.assign({}, tabbedWindows[tabWindow.uuid], {[tabWindow.name]: true});
        });
    });

    // Iterate over apps in layout.
    // Check if we need to make tabbed vs. normal placeholders for both main windows and child windows.
    // Push those placeholder windows into tabbedPlaceholdersToWindows object
    // If an app is running, we need to check which of its child windows are open.
    for (const app of payload.apps) {
        // We use the v1 version of Application.wrap(...) due to an event-loop bug when
        // calling the v2 version inside a channel callback. Due for fix in v35
        const ofApp = fin.desktop.Application.wrap(app.uuid);
        const isRunning = await p<boolean>(ofApp.isRunning.bind(ofApp))();
        if (isRunning) {
            // Should de-tab here.
            await TabService.INSTANCE.removeTab(app.mainWindow);

            // Need to check its child windows here, if confirmed.
            await childWindowPlaceholderCheckRunningApp(app);
        } else {
            if (inTabbedWindowsObject(app.mainWindow)) {
                await createTabbedPlaceholderAndRecord(app.mainWindow);
                await childWindowPlaceholderCheck(app);
            } else {
                await createNormalPlaceholder(app.mainWindow);
                await childWindowPlaceholderCheck(app);
            }
        }
    }

    // Edit the tabGroups object with the placeholder window names/uuids, so we can create a Tab Group with a combination of open applications and placeholder
    // windows.
    payload.tabGroups.forEach((tabBlob) => {
        const activeWindow = tabBlob.groupInfo.active;
        // Active Window could be a placeholder window.
        if (inTabbedPlaceholdersToWindowsObject(activeWindow)) {
            tabBlob.groupInfo.active = tabbedPlaceholdersToWindows[activeWindow.uuid][activeWindow.name];
        }

        tabBlob.tabs.forEach((tabWindow, windowIdx) => {
            if (inTabbedPlaceholdersToWindowsObject(tabWindow)) {
                tabBlob.tabs[windowIdx] = tabbedPlaceholdersToWindows[tabWindow.uuid][tabWindow.name];
            }
        });
    });

    await TabService.INSTANCE.createTabGroupsFromTabBlob(payload.tabGroups);

    const apps = await promiseMap(layout.apps, async(app: LayoutApp): Promise<LayoutApp> => {
        // Get rid of childWindows for default response (anything else?)
        const defaultResponse = {...app, childWindows: []};
        try {
            const {uuid} = app;
            const name = uuid;
            console.log('Restoring App:', app);
            const ofApp = await fin.Application.wrap({uuid});
            const isRunning = await ofApp.isRunning();
            if (isRunning) {
                const appConnection = getClientConnection({uuid, name});
                if (appConnection) {
                    // CREATE CHILD WINDOW PLACEHOLDER IMAGES???
                    await positionWindow(app.mainWindow);
                    console.log('App is running:', app);
                    // Send LayoutApp to connected application so it can handle child WIndows
                    const response: LayoutApp|false = await providerChannel.dispatch(appConnection, 'restoreApp', app);
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
                        fin.desktop.Application.createFromManifest(app.manifestUrl!, (v1App: fin.OpenFinApplication) => {
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
