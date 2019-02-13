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
import {addToWindowObject, childWindowPlaceholderCheck, childWindowPlaceholderCheckRunningApp, createNormalPlaceholder, createTabbedPlaceholderAndRecord, inWindowObject, parseVersionString, positionWindow, SemVer, TabbedPlaceholders, waitUntilAllPlaceholdersClosed, wasCreatedProgrammatically, WindowObject} from './utils';

// Duration in milliseconds that the entire Workspace restore may take, before we allow another restore to start
const GLOBAL_EXCLUSIVITY_TIMEOUT = 120000;

// Duration in milliseconds that we give a client app to startup when restoring a Workspace
const CLIENT_STARTUP_TIMEOUT = 60000;

// Duration in milliseconds that we give a client app to restore itself when restoring a Workspace
const CLIENT_RESTORE_TIMEOUT = 60000;

const appsToRestoreWhenReady = new Map<string, AppToRestore>();

// A token unique to the current run of restoreWorkspace, needed so that we can correctly release the exclusivity token after a timeout if needed
let restoreExclusivityToken: {}|null = null;

interface AppToRestore {
    workspaceApp: WorkspaceApp;
    resolve: Function;
}

export const appReadyForRestore = async(uuid: string): Promise<void> => {
    const appToRestore = appsToRestoreWhenReady.get(uuid)!;

    if (appToRestore) {
        const {workspaceApp, resolve} = appToRestore;

        appsToRestoreWhenReady.delete(uuid);

        requestClientRestoreApp(workspaceApp, resolve);
    } else {
        console.warn('Ignoring duplicate \'appReadyForRestore\' call');
    }
};

export const restoreWorkspace = async(payload: Workspace): Promise<Workspace> => {
    console.log('Restoring workspace:', payload);

    if (restoreExclusivityToken !== null) {
        throw new Error('Attempting to restore while restore in progress');
    }

    validatePayload(payload);

    startExclusivityTimeout();

    const workspace = payload;
    const startupApps: Promise<WorkspaceApp>[] = [];

    await createWorkspacePlaceholders(workspace);

    const apps: WorkspaceApp[] = await promiseMap(workspace.apps, app => restoreApp(app, startupApps));

    // Wait for all apps to startup
    const startupResponses: WorkspaceApp[] = await Promise.all(startupApps);

    // Wait for all child windows to appear. Continue and Warn if placeholders aren't closed in 60 seconds.
    try {
        await waitUntilAllPlaceholdersClosed();
    } catch (error) {
        console.warn(error);
    }

    // Consolidate application responses
    const allAppResponses: WorkspaceApp[] = apps.map(app => {
        const appResponse = startupResponses.find(appRes => appRes.uuid === app.uuid);
        return appResponse ? appResponse : app;
    });
    workspace.apps = allAppResponses;

    // Regroup the windows
    await regroupWorkspace(allAppResponses).catch(console.log);
    // Validate groups
    for (const group of model.snapGroups) {
        group.validate();
    }

    apiHandler.sendToAll('workspace-restored', workspace);

    restoreExclusivityToken = null;

    console.log('Restore completed');

    // Send the workspace back to the requester of the restore
    return workspace;
};

const requestClientRestoreApp = async(workspaceApp: WorkspaceApp, resolve: Function): Promise<void> => {
    const {uuid} = workspaceApp;
    const appConnection = apiHandler.isClientConnection({uuid, name: uuid});
    if (appConnection) {
        // Instruct app to restore its child windows
        const appworkspaceAppResult = await clientRestoreAppWithTimeout(workspaceApp, false);

        resolve(appworkspaceAppResult);
    }
};

const validatePayload = (payload: Workspace): void => {
    // Guards against invalid workspace objects (since we are receiving them over the service bus, this is in theory possible)
    // These allow us to return sensible error messages back to the consumer
    if (!payload) {
        throw new Error('Received invalid workspace object');
    }
    if (!payload.schemaVersion) {
        throw new Error('Received invalid workspace object: payload.schemaVersion is undefined');
    } else {
        let providedSchemaVersion: SemVer;
        try {
            providedSchemaVersion = parseVersionString(payload.schemaVersion);
        } catch (e) {
            throw new Error('Received invalid workspace object: schemaVersion string does not comply with semver format ("a.b.c")');
        }

        // Only checks major version. Service is assumed to work with minor and patch version changes.
        if (providedSchemaVersion.major > SCHEMA_MAJOR_VERSION) {
            throw new Error(`Received incompatible worksapce object. Provided schemaVersion is ${
                payload.schemaVersion}, but this version of the service only supports versions up to ${SCHEMA_MAJOR_VERSION}.x.x`);
        }
    }

    if (!payload.apps) {
        throw new Error('Received invalid workspace object: payload.apps is undefined');
    }
    if (!payload.monitorInfo) {
        throw new Error('Received invalid workspace object: payload.monitorInfo is undefined');
    }
};

const startExclusivityTimeout = (): void => {
    (() => {
        restoreExclusivityToken = {};
        const capturedRestoreExclusivityToken = restoreExclusivityToken;

        setTimeout(() => {
            if (capturedRestoreExclusivityToken === restoreExclusivityToken) {
                restoreExclusivityToken = null;

                appsToRestoreWhenReady.clear();
            }
        }, GLOBAL_EXCLUSIVITY_TIMEOUT);
    })();
};

const createWorkspacePlaceholders = async(workspace: Workspace): Promise<void> => {
    const tabbedWindows: WindowObject = {};
    const openWindows: WindowObject = {};
    const tabbedPlaceholdersToWindows: TabbedPlaceholders = {};

    // Create tabbedWindows list so we don't have to iterate over all of the tabGroup arrays.
    workspace.tabGroups.forEach((tabGroup) => {
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

    // Iterate over apps in workspace.
    // Check if we need to make tabbed vs. normal placeholders for both main windows and child windows.
    // Push those placeholder windows into tabbedPlaceholdersToWindows object
    // If an app is running, we need to check which of its child windows are open.
    async function createWorkspaceAppPlaceholders(app: WorkspaceApp) {
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
    await promiseMap(workspace.apps, createWorkspaceAppPlaceholders);

    // Edit the tabGroups object with the placeholder window names/uuids, so we can create a Tab Group with a combination of open applications and placeholder
    // windows.
    workspace.tabGroups.forEach((groupDef: TabGroup) => {
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

    await tabService.createTabGroupsFromWorkspace(workspace.tabGroups);
};

const restoreApp = async(app: WorkspaceApp, startupApps: Promise<WorkspaceApp>[]): Promise<WorkspaceApp> => {
    // Get rid of childWindows for default response (anything else?)
    const defaultResponse = {...app, childWindows: []};
    try {
        const {uuid} = app;
        console.log('Restoring App:', app);
        const ofApp = await fin.Application.wrap({uuid});
        const isRunning = await ofApp.isRunning();
        if (isRunning) {
            const appConnected = apiHandler.channel.connections.some((conn: Identity) => conn.uuid === uuid && conn.name === uuid);
            if (appConnected) {
                await positionWindow(app.mainWindow);
                console.log('App is running:', app);
                // Send WorkspaceApp to connected application so it can handle child windows
                return await clientRestoreAppWithTimeout(app, true);
            } else {
                // Not connected to service
                console.log('App is open, but not connected to the service:', app);
                await positionWindow(app.mainWindow);
                return defaultResponse;
            }
        } else {
            let ofAppNotRunning: Application|undefined;
            console.log('App is not running:', app);

            // App is not running - setup communication to fire once app is started
            if (app.confirmed) {
                startupApps.push(new Promise((resolve: (workspaceApp: WorkspaceApp) => void) => {
                    setAppToClientRestoreWithTimeout(app, resolve);
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
                    ofAppNotRunning = await fin.Application.create(app.initialOptions);
                } else {
                    console.error('Unable to restart programmatically launched app:', app);
                }
            }

            if (ofAppNotRunning) {
                await ofAppNotRunning.run().catch(console.log);
                await model.expect({uuid, name: uuid});
                await positionWindow(app.mainWindow);
            }
            // SHOULD WE RETURN DEFAULT RESPONSE HERE?!?
            return defaultResponse;
        }
    } catch (e) {
        console.error('Error restoring app', app, e);
        return defaultResponse;
    }
};

const clientRestoreAppWithTimeout = async(app: WorkspaceApp, mayBeLegacyApp: boolean): Promise<WorkspaceApp> => {
    const identity = {uuid: app.uuid, name: app.uuid};

    const defaultResponse = {...app, childWindows: []};

    const sendToClientPromises = [apiHandler.sendToClient<WorkspaceApp, WorkspaceApp|false>(identity, WorkspaceAPI.RESTORE_HANDLER, app)];
    if (mayBeLegacyApp) {
        sendToClientPromises.push(apiHandler.sendToClient<WorkspaceApp, WorkspaceApp|false>(identity, LegacyAPI.RESTORE_HANDLER, app));
    }

    const responsePromise = Promise.race(sendToClientPromises).then((response: WorkspaceApp|false|undefined) => response ? response : defaultResponse);

    const timeoutPromise = new Promise<WorkspaceApp>((response) => setTimeout(() => response(defaultResponse), CLIENT_RESTORE_TIMEOUT));

    return Promise.race([responsePromise, timeoutPromise]);
};

const setAppToClientRestoreWithTimeout = (workspaceApp: WorkspaceApp, resolve: Function): void => {
    const {uuid} = workspaceApp;
    const save = {workspaceApp, resolve};

    const defaultResponse = {...workspaceApp, childWindows: []};

    appsToRestoreWhenReady.set(uuid, save);

    setTimeout(() => {
        if (appsToRestoreWhenReady.delete(uuid)) {
            resolve(defaultResponse);
        }
    }, CLIENT_STARTUP_TIMEOUT);
};