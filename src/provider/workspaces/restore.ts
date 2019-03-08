import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {WorkspaceAPI} from '../../client/internal';
import {TabGroup, Workspace, WorkspaceApp, WorkspaceRestoredEvent} from '../../client/workspaces';
import {EVENT_CHANNEL_TOPIC} from '../APIMessages';
import {apiHandler, loader, model, tabService} from '../main';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {promiseMap, promiseForEach, promiseFilter} from '../snapanddock/utils/async';

import {SCHEMA_MAJOR_VERSION} from './create';
import {regroupWorkspace} from './group';
import {addToWindowObject, canRestoreProgrammatically, childWindowPlaceholderCheck, childWindowPlaceholderCheckRunningApp, closeCorrespondingPlaceholder, createNormalPlaceholder, createTabbedPlaceholderAndRecord, inWindowObject, parseVersionString, positionWindow, SemVer, TabbedPlaceholders, waitUntilAllPlaceholdersClosed, WindowObject, cleanupPlaceholderObjects} from './utils';

// Duration in milliseconds that the entire Workspace restore may take, before we allow another restore to start
const GLOBAL_EXCLUSIVITY_TIMEOUT = 120000;

// Duration in milliseconds that we give the run() call for a client app to resolve
const CLIENT_APP_RUN_TIMEOUT = 60000;

// Duration in milliseconds that we give a client app to call appReadyForRestore() after being started
const CLIENT_APP_READY_TIMEOUT = 60000;

// Duration in milliseconds that we give a client app to restore itself and its children when given a WorkspaceApp
const CLIENT_APP_RESTORE_TIMEOUT = 60000;

// All apps that we've ever received a appReadyForRestore call from. Used as a heuristic to determine which apps properly implement S&R features
const allAppsEverReady = new Map<string, boolean>();

const appsToRestoreWhenReady = new Map<string, AppToRestore>();

const appsToDeleteFromWorkspace = new Set<string>();

let timeoutsToClear: number[] = [];

// A token unique to the current run of restoreWorkspace, needed so that we can correctly release the exclusivity token after a timeout if needed
let restoreExclusivityToken: {}|null = null;

interface AppToRestore {
    workspaceApp: WorkspaceApp;
    resolve: Function;
}

export const appReadyForRestore = async(uuid: string): Promise<void> => {
    allAppsEverReady.set(uuid, true);

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

    // Ensure the loader links any apps being programmatically restored with their parentUuid at time of workspace
    // generation, rather than their parentUuid now (which will be layouts-service)
    payload.apps.forEach((app: WorkspaceApp) => {
        if (app.parentUuid) {
            loader.overrideAppParent(app.uuid, app.parentUuid);
        }
    });

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

    // Consolidate application responses
    const allAppResponses: WorkspaceApp[] = apps.map(app => {
        const appResponse = startupResponses.find(appRes => appRes.uuid === app.uuid);
        return appResponse ? appResponse : app;
    });

    // Go through all of the app responses and check them for failures. Exclude any apps that didn't come up from returned Workspace.
    const processedAppResponses: WorkspaceApp[] = await promiseFilter(allAppResponses, async (appResponse) => {
        return await processAppResponse(appResponse, workspace);
    });

    workspace.apps = processedAppResponses;

    // Wait for all child windows to appear. Continue and Warn if placeholders aren't closed in 60 seconds.
    try {
        await waitUntilAllPlaceholdersClosed();
    } catch (error) {
        console.warn(error);
    }

    // Regroup the windows
    await regroupWorkspace(processedAppResponses).catch(console.log);
    // Validate groups
    for (const group of model.snapGroups) {
        group.validate();
    }

    const event: WorkspaceRestoredEvent = {type: 'workspace-restored', workspace};
    apiHandler.sendToAll(EVENT_CHANNEL_TOPIC, event);

    restorationCleanup();

    console.log('Restore completed: ', workspace);

    // Send the workspace back to the requester of the restore
    return workspace;
};

const restorationCleanup = (): void => {
    restoreExclusivityToken = null;
    cleanupPlaceholderObjects();
    appsToDeleteFromWorkspace.clear();
    appsToRestoreWhenReady.clear();
    timeoutsToClear.forEach((timeout) => clearTimeout(timeout));
    timeoutsToClear = [];
};


export const appCanRestore = (uuid: string): boolean => {
    return allAppsEverReady.has(uuid);
};

// Check app response against appsToDeleteFromWorkspace to remove it from the Workspace and close its placeholders
// Check the app responses's child windows against the original child windows in WorkspaceApp, and close any hanging placeholders.
const processAppResponse = async(appResponse: WorkspaceApp, workspace: Workspace): Promise<boolean> => {
    if (appsToDeleteFromWorkspace.has(appResponse.uuid)) {
        console.error(`App launch for ${appResponse.uuid} failed. Application will be removed from workspace: `, appResponse);
        await closeCorrespondingPlaceholder({uuid: appResponse.uuid, name: appResponse.uuid});
        promiseForEach(appResponse.childWindows, closeCorrespondingPlaceholder);
        return false;
    } else {
        const originalWorkspaceApp: WorkspaceApp = workspace.apps.find((potentialMatch) => potentialMatch.uuid === appResponse.uuid)!;
        promiseForEach(originalWorkspaceApp.childWindows, async (childWindow) => {
            const hasChildWindowInAppResponse = appResponse.childWindows.some((appResponseChildWin) => appResponseChildWin.name === childWindow.name);
            if (!hasChildWindowInAppResponse) {
                console.error(
                    `Application ${appResponse.uuid} did not restore its child window ${childWindow.name} 
                        (or the App's setGenerateHandler didn't return that child window). Placeholder will be closed: 
                    `,
                    appResponse);
                await closeCorrespondingPlaceholder(childWindow);
            }
        });
        return true;
    }
};

const requestClientRestoreApp = async(workspaceApp: WorkspaceApp, resolve: Function): Promise<void> => {
    const {uuid} = workspaceApp;
    const appConnection = apiHandler.isClientConnection({uuid, name: uuid});
    if (appConnection) {
        // Instruct app to restore its child windows
        const appworkspaceAppResult = await clientRestoreAppWithTimeout(workspaceApp);

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

            // Need to check its child windows here, if confirmed.
            // Also calls removeTab and setSnapGroup on open child windows.
            // These functions need to be in this order, otherwise child windows may re-attach (if removeTab is called on an application that it's tabbed to,
            // leaving the child window as a remainingTab).
            await childWindowPlaceholderCheckRunningApp(app, tabbedWindows, tabbedPlaceholdersToWindows, openWindows);

            if (mainWindowModel && mainWindowModel.snapGroup.length > 1) {
                await mainWindowModel.setSnapGroup(new DesktopSnapGroup());
            }
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
                await positionWindow(app.mainWindow, false);
                console.log('App is running:', app);
                // Send WorkspaceApp to connected application so it can handle child windows
                return await clientRestoreAppWithTimeout(app);
            } else {
                // Not connected to service
                console.log('App is open, but not connected to the service:', app);
                await positionWindow(app.mainWindow, false);
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
                if (canRestoreProgrammatically(app)) {
                    console.warn('App created programmatically, app may not restart again:', app);
                    ofAppNotRunning = await fin.Application.create(app.initialOptions);
                } else {
                    console.error('Unable to restart programmatically launched app:', app);
                }
            }

            if (ofAppNotRunning) {
                let timeout;
                // Application.run() can hang with createFromManifest calls, so we set a timeout to continue restoration
                // Even if run() hangs.
                const timeoutPromise = new Promise<string>((resolve, reject) => timeout = window.setTimeout(() => {
                    reject(`Run was called on Application ${app.uuid}, but it seems to be hanging. Continuing restoration.`);
                }, CLIENT_APP_RUN_TIMEOUT));
                const runCall = ofAppNotRunning.run();

                await Promise.race([timeoutPromise, runCall]);

                clearTimeout(timeout);
                await model.expect({uuid, name: uuid});
                await positionWindow(app.mainWindow, true);
            }
            // SHOULD WE RETURN DEFAULT RESPONSE HERE?!?
            return defaultResponse;
        }
    } catch (e) {
        console.error('Error restoring app', app, e);
        // App has failed to start. Let's mark it as such so we can delete it from the workspace later.
        appsToDeleteFromWorkspace.add(app.uuid);
        deleteAppFromRestoreWhenReadyMap(app);
        return defaultResponse;
    }
};

// If an app fails to create during the beginning of the restore process, resolve its pending setAppToClientRestoreWithTimeout promise and remove it from
// appsToRestoreWhenReady Finally, add to appsToDeleteFromWorkspace so it can get cleaned up in the processAppResponse function.
const deleteAppFromRestoreWhenReadyMap = (app: WorkspaceApp) => {
    const appThatFailedToRestore = appsToRestoreWhenReady.get(app.uuid);
    if (appThatFailedToRestore) {
        appsToRestoreWhenReady.delete(app.uuid);
        const {workspaceApp, resolve} = appThatFailedToRestore;
        resolve(workspaceApp);
    }
};

// Attempt to send the WorkspaceApp object to an application that has signaled that it's ready, and wait for it to respond back.
// If the message hangs, resolve this hanging promise with a modified WorkspaceApp object.
const clientRestoreAppWithTimeout = async(workspaceApp: WorkspaceApp): Promise<WorkspaceApp> => {
    const identity = {uuid: workspaceApp.uuid, name: workspaceApp.uuid};

    const defaultResponse = {...workspaceApp, childWindows: []};
    const failedResponse = {...workspaceApp, childWindows: [], confirmed: false};
    let timeout: number;

    const sendToClientPromises =
        apiHandler.sendToClient<WorkspaceAPI.RESTORE_HANDLER, WorkspaceApp|false>(identity, WorkspaceAPI.RESTORE_HANDLER, workspaceApp);

    // Need to clear timeout once this responsePromise resolves.
    const responsePromise = sendToClientPromises.then((response: WorkspaceApp|false|undefined) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        return response ? response : defaultResponse;
    });

    const timeoutPromise = new Promise<WorkspaceApp>((resolve) => timeout = window.setTimeout(() => {
        console.error(
            `Sent WorkspaceApp object to ${workspaceApp.uuid}'s restore handler, but it timed out. 
                Child window restoration may have failed. 
                Application's child windows and confirmed status will be removed: 
            `,
            workspaceApp);
            promiseForEach(workspaceApp.childWindows, closeCorrespondingPlaceholder);
        resolve(failedResponse);
    }, CLIENT_APP_RESTORE_TIMEOUT));

    return Promise.race([responsePromise, timeoutPromise]);
};

// Adds the WorkspaceApp object to a map, and waits for its corresponding application to come up.
// Once the application comes up, it is given that WorkspaceApp object to use for child window restoration.
// If the application never comes up, we resolve this hanging promise and nullify that application's child windows.
const setAppToClientRestoreWithTimeout = (workspaceApp: WorkspaceApp, resolve: Function): void => {
    const {uuid} = workspaceApp;
    const save = {workspaceApp, resolve};

    const failedResponse = {...workspaceApp, childWindows: [], confirmed: false};

    appsToRestoreWhenReady.set(uuid, save);

    const timeout = window.setTimeout(() => {
        if (appsToRestoreWhenReady.delete(uuid)) {
            console.error(
                `App ${uuid} failed to call its ready function. 
                    App is either not launching, or didn't call ready. 
                    Application's child windows and confirmed status will be removed: 
                `,
                workspaceApp);
                promiseForEach(workspaceApp.childWindows, closeCorrespondingPlaceholder);
            resolve(failedResponse);
        }
    }, CLIENT_APP_READY_TIMEOUT);

    timeoutsToClear.push(timeout);
};