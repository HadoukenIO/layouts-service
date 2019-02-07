import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {WorkspaceAPI} from '../../client/internal';
import {TabGroup, Workspace, WorkspaceApp} from '../../client/types';
import {LegacyAPI} from '../APIMessages';
import {apiHandler, model, tabService} from '../main';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {promiseMap} from '../snapanddock/utils/async';

import {SCHEMA_MAJOR_VERSION} from './create';
import {regroupWorkspace} from './group';
import {addToWindowObject, childWindowPlaceholderCheck, childWindowPlaceholderCheckRunningApp, createNormalPlaceholder, createTabbedPlaceholderAndRecord, inWindowObject, parseVersionString, positionWindow, SemVer, TabbedPlaceholders, wasCreatedProgrammatically, WindowObject} from './utils';

const appsToRestore = new Map();
const appsCurrentlyRestoring = new Map();

interface AppToRestore {
    layoutApp: WorkspaceApp;
    resolve: Function;
}

const setAppToRestore = (layoutApp: WorkspaceApp, resolve: Function): void => {
    const {uuid} = layoutApp;
    const save = {layoutApp, resolve};
    appsToRestore.set(uuid, save);
};

export const getAppToRestore = (uuid: string): AppToRestore => {
    return appsToRestore.get(uuid);
};

export const restoreApplication = async(layoutApp: WorkspaceApp, resolve: Function): Promise<void> => {
    const {uuid} = layoutApp;
    const name = uuid;
    const defaultResponse: WorkspaceApp = {...layoutApp, childWindows: []};
    const appConnection = apiHandler.isClientConnection({uuid, name});
    if (appConnection) {
        if (appsToRestore.has(uuid) && !appsCurrentlyRestoring.has(uuid)) {
            // Instruct app to restore its child windows
            appsCurrentlyRestoring.set(uuid, true);
            const responseAppLayout: WorkspaceApp|false = await apiHandler.channel.dispatch({uuid, name}, WorkspaceAPI.RESTORE_HANDLER, layoutApp);

            // Flag app as restored
            appsCurrentlyRestoring.delete(uuid);
            appsToRestore.delete(uuid);
            if (responseAppLayout) {
                resolve(responseAppLayout);
            } else {
                resolve(defaultResponse);
            }
        } else {
            console.warn('Ignoring duplicate \'ready\' call');
        }
    }
};

export const restoreWorkspace = async(payload: Workspace, identity: Identity): Promise<Workspace> => {
    // Guards against invalid layout objects (since we are receiving them over the service bus, this is in theory possible)
    // These allow us to return sensible error messages back to the consumer
    if (!payload) {
        throw new Error('Received invalid layout object');
    }
    if (!payload.schemaVersion) {
        throw new Error('Received invalid layout object: layout.schemaVersion is undefined');
    } else {
        let providedSchemaVersion: SemVer;
        try {
            providedSchemaVersion = parseVersionString(payload.schemaVersion);
        } catch (e) {
            throw new Error('Received invalid layout object: schemaVersion string does not comply with semver format ("a.b.c")');
        }

        // Only checks major version. Service is assumed to work with minor and patch version changes.
        if (providedSchemaVersion.major > SCHEMA_MAJOR_VERSION) {
            throw new Error(`Received incompatible layout object. Provided schemaVersion is ${
                payload.schemaVersion}, but this version of the service only supports versions up to ${SCHEMA_MAJOR_VERSION}.x.x`);
        }
    }

    if (!payload.apps) {
        throw new Error('Received invalid layout object: layout.apps is undefined');
    }
    if (!payload.monitorInfo) {
        throw new Error('Received invalid layout object: layout.monitorInfo is undefined');
    }

    const layout = payload;
    const startupApps: Promise<WorkspaceApp>[] = [];
    const tabbedWindows: WindowObject = {};
    const openWindows: WindowObject = {};
    const tabbedPlaceholdersToWindows: TabbedPlaceholders = {};

    // Create tabbedWindows list so we don't have to iterate over all of the tabGroup arrays.
    layout.tabGroups.forEach((tabGroup) => {
        tabGroup.tabs.forEach(tabWindow => {
            addToWindowObject(tabWindow, tabbedWindows);
        });
    });

    // Create openWindows list so we don't have to iterate over all of the open windows.
    const allApps = await fin.System.getAllWindows();

    allApps.forEach((appGroup) => {
        openWindows[appGroup.uuid] = Object.assign({}, openWindows[appGroup.uuid], {[appGroup.mainWindow.name]: true});
        appGroup.childWindows.forEach((childWindow) => {
            openWindows[appGroup.uuid] = Object.assign({}, openWindows[appGroup.uuid], {[childWindow.name]: true});
        });
    });

    // Iterate over apps in layout.
    // Check if we need to make tabbed vs. normal placeholders for both main windows and child windows.
    // Push those placeholder windows into tabbedPlaceholdersToWindows object
    // If an app is running, we need to check which of its child windows are open.
    async function createAllPlaceholders(app: WorkspaceApp) {
        const ofApp = fin.Application.wrapSync(app);
        const isRunning = await ofApp.isRunning();
        if (isRunning) {
            // Should de-tab here.
            const mainWindowModel = model.getWindow(app.mainWindow);
            await tabService.removeTab(app.mainWindow);
            if (mainWindowModel && mainWindowModel.snapGroup.length > 1) {
                await mainWindowModel.setSnapGroup(new DesktopSnapGroup());
            }


            // Need to check its child windows here, if confirmed.
            await childWindowPlaceholderCheckRunningApp(app, tabbedWindows, tabbedPlaceholdersToWindows, openWindows);
        } else {
            if (inWindowObject(app.mainWindow, tabbedWindows)) {
                await createTabbedPlaceholderAndRecord(app.mainWindow, tabbedPlaceholdersToWindows);
                await childWindowPlaceholderCheck(app, tabbedWindows, tabbedPlaceholdersToWindows);
            } else {
                await createNormalPlaceholder(app.mainWindow);
                await childWindowPlaceholderCheck(app, tabbedWindows, tabbedPlaceholdersToWindows);
            }
        }
    }

    // Kick off placeholder creation for all apps.
    await promiseMap(layout.apps, createAllPlaceholders);

    // Edit the tabGroups object with the placeholder window names/uuids, so we can create a Tab Group with a combination of open applications and placeholder
    // windows.
    layout.tabGroups.forEach((groupDef: TabGroup) => {
        const activeWindow = groupDef.groupInfo.active;
        // Active Window could be a placeholder window.
        if (inWindowObject(activeWindow, tabbedPlaceholdersToWindows)) {
            groupDef.groupInfo.active = tabbedPlaceholdersToWindows[activeWindow.uuid][activeWindow.name];
        }

        groupDef.tabs.forEach((tabWindow, windowIdx) => {
            if (inWindowObject(tabWindow, tabbedPlaceholdersToWindows)) {
                groupDef.tabs[windowIdx] = tabbedPlaceholdersToWindows[tabWindow.uuid][tabWindow.name];
            }
        });
    });

    await tabService.createTabGroupsFromWorkspace(layout.tabGroups);

    const apps = await promiseMap(layout.apps, async(app: WorkspaceApp): Promise<WorkspaceApp> => {
        // Get rid of childWindows for default response (anything else?)
        const defaultResponse = {...app, childWindows: []};
        try {
            const {uuid} = app;
            const name = uuid;
            console.log('Restoring App:', app);
            const ofApp = await fin.Application.wrap({uuid});
            const isRunning = await ofApp.isRunning();
            if (isRunning) {
                const appConnected = apiHandler.channel.connections.some((conn: Identity) => conn.uuid === uuid && conn.name === name);
                if (appConnected) {
                    await positionWindow(app.mainWindow);
                    console.log('App is running:', app);
                    // Send LayoutApp to connected application so it can handle child windows
                    const response: WorkspaceApp|false|undefined = await Promise.race([
                        apiHandler.sendToClient<WorkspaceApp, WorkspaceApp|false>({uuid, name}, WorkspaceAPI.RESTORE_HANDLER, app),
                        apiHandler.sendToClient<WorkspaceApp, WorkspaceApp|false>({uuid, name}, LegacyAPI.RESTORE_HANDLER, app)
                    ]);
                    console.log('Response from restore:', response);
                    return response ? response : defaultResponse;
                } else {
                    // Not connected to service
                    await positionWindow(app.mainWindow);
                    return defaultResponse;
                }
            } else {
                let ofAppNotRunning: undefined|Application;
                console.log('App is not running:', app);

                // App is not running - setup communication to fire once app is started
                if (app.confirmed) {
                    startupApps.push(new Promise((resolve: (layoutApp: WorkspaceApp) => void) => {
                        setAppToRestore(app, resolve);
                    }));
                }
                // Start App
                if (app.manifestUrl) {
                    // If app created by manifest
                    const {manifestUrl} = app;
                    console.log('App has manifestUrl:', app);
                    ofAppNotRunning = await fin.Application.createFromManifest(manifestUrl);
                } else {
                    // If application created programmatically
                    if (wasCreatedProgrammatically(app)) {
                        console.warn('App created programmatically, app may not restart again:', app);
                        if (app.initialOptions) {
                            if (app.initialOptions.mainWindowOptions) {
                                app.initialOptions.mainWindowOptions.autoShow = false;
                            } else {
                                app.initialOptions.mainWindowOptions = {autoShow: false};
                            }
                        }
                        ofAppNotRunning = await fin.Application.create(app.initialOptions);
                    } else {
                        console.error('Unable to restart programmatically launched app:', app);
                    }
                }

                if (ofAppNotRunning) {
                    await ofAppNotRunning.run().catch(console.log);
                    await model.expect({name, uuid});
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
    await regroupWorkspace(allAppResponses).catch(console.log);
    // Validate groups
    for (const group of model.snapGroups) {
        group.validate();
    }

    apiHandler.sendToAll('workspace-restored', layout);

    // Send the layout back to the requester of the restore
    return layout;
};
