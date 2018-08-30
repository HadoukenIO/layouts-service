import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {promiseMap} from '../snapanddock/utils/async';
import {Layout, LayoutApp, LayoutName, WindowState} from '../../client/types';

import {regroupLayout} from './group';
import {providerChannel} from '../main';
import {createAppPlaceholders, createTabPlaceholder, createNormalPlaceholder, isClientConnection, positionWindow, wasCreatedProgrammatically} from './utils';

import {createTabGroupsFromTabBlob} from '../tabbing/TabUtilities';
import { TabService } from '../tabbing/TabService';
import { removeTab } from '../tabbing/SaveAndRestoreAPI';



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

export async function delay(milliseconds: number) {
    return new Promise<void>(r => setTimeout(r, milliseconds));
}

export const restoreLayout = async(payload: Layout, identity: Identity): Promise<Layout> => {
    console.log("PAYLOAD", payload);

    const layout = payload;
    const startupApps: Promise<LayoutApp>[] = [];
    /*tslint:disable-next-line:no-any*/
    const tabbedWindows: any = {};
    /*tslint:disable-next-line:no-any*/
    const tabbedPlaceholdersToWindows: any = {};

    function inTabbedWindowsObject(win: {uuid: string, name: string}) {
        if (tabbedWindows[win.uuid]) {
            if (tabbedWindows[win.uuid][win.name]) {
                return true;
            }
        }
        return false;
    }

    function inTabbedPlaceholdersToWindowsObject(win: {uuid: string, name: string}) {
        if (tabbedPlaceholdersToWindows[win.uuid]) {
            if (tabbedPlaceholdersToWindows[win.uuid][win.name]) {
                return true;
            }
        }
        return false;
    }

    async function createTabbedPlaceholderAndRecord(win: WindowState) {
        const tabPlaceholder = await createTabPlaceholder(win);
        tabbedPlaceholdersToWindows[win.uuid] = { [win.name]: {name: tabPlaceholder.name, uuid: tabPlaceholder.uuid} };
    }

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

    async function childWindowPlaceholderCheckRunningApp(app: LayoutApp) {
        if (app.confirmed) {
            const mainApp = await fin.Application.wrap(app.mainWindow);
            console.log('app', app);
            console.log('main App', mainApp);
            const openChildWindows = await mainApp.getChildWindows();
            console.log('openChildWindows', openChildWindows);

            for (const win of app.childWindows) {
                /*tslint:disable-next-line:no-any*/
                const windowIsOpen = openChildWindows.some((openWin: any) => openWin.identity.name === win.name);
                console.log('win', win);
                console.log('openChildWindows', openChildWindows);
                console.log('windowIsOpen', windowIsOpen);

                if (!windowIsOpen) {
                    if (inTabbedWindowsObject(win)) {
                        await createTabbedPlaceholderAndRecord(win);
                    } else {
                        await createNormalPlaceholder(win);
                    }
                }
            }
        } else {
            return;
        }
    }

    // Create tabbedWindows list so we don't have to iterate over all of the tabGroup/TabBlob arrays. 
    if (payload.tabGroups) {
        payload.tabGroups.forEach((tabGroup) => {
            tabGroup.tabs.forEach(tabWindow => {
                tabbedWindows[tabWindow.uuid] = {[tabWindow.name]: true};
            });
        });
    }

    console.log('tabbedWindows', tabbedWindows);

    // Iterate over apps in layout.
    // Check if we need to make tabbed vs. normal placeholders for both main windows and child windows.
    // Push those placeholder windows into tabbedPlaceholdersToWindows object
    for (const app of payload.apps) {
        const { uuid } = app;
        const ofApp = await fin.Application.wrap({ uuid });
        const isRunning = await ofApp.isRunning();
        if (isRunning) {
            console.log("IS RUNNING");
            // Should de-tab here.

            removeTab(app.mainWindow);
            // Need to check its child windows here, if confirmed.
            await childWindowPlaceholderCheckRunningApp(app);
        } else {
            console.log("ISN'T RUNNING. MAKE PLACEHOLDER");
            if (inTabbedWindowsObject(app.mainWindow)) {
                await createTabbedPlaceholderAndRecord(app.mainWindow);
                await childWindowPlaceholderCheck(app);
            } else {
                await createNormalPlaceholder(app.mainWindow);
                await childWindowPlaceholderCheck(app);
            }
        }
    }


    console.log('tabbedPlaceholdersToWindows', tabbedPlaceholdersToWindows);

    console.log("tabGroups before", payload.tabGroups);
    if (payload.tabGroups) {
        payload.tabGroups.forEach((tabBlob) => {
            const activeWindow = tabBlob.groupInfo.active;
            tabBlob.groupInfo.active = tabbedPlaceholdersToWindows[activeWindow.uuid][activeWindow.name];

            tabBlob.tabs.forEach((tabWindow, windowIdx) => {
                if (inTabbedPlaceholdersToWindowsObject(tabWindow)) {
                    tabBlob.tabs[windowIdx] = tabbedPlaceholdersToWindows[tabWindow.uuid][tabWindow.name];
                }
            });
        });

        console.log("tabGroups after", payload.tabGroups);
        await createTabGroupsFromTabBlob(payload.tabGroups);
    }

    // await delay(99999999999);

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
                // await createAppPlaceholders(app);

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
