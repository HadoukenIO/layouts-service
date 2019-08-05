import {Application} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {WorkspaceAPI} from '../../client/internal';
import {TabGroup, Workspace, WorkspaceApp, WorkspaceRestoredEvent} from '../../client/workspaces';
import {EVENT_CHANNEL_TOPIC} from '../APIMessages';
import {apiHandler, model, tabService} from '../main';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {promiseFilter, promiseForEach, promiseMap} from '../snapanddock/utils/async';

import {regroupWorkspace} from './group';
import {addToWindowObject, childWindowPlaceholderCheck, childWindowPlaceholderCheckRunningApp, cleanupPlaceholderObjects, closeCorrespondingPlaceholder, createNormalPlaceholder, createTabbedPlaceholderAndRecord, getId, getWindowsWithManuallyClosedPlaceholders, inWindowObject, positionWindow, TabbedPlaceholders, waitUntilAllPlaceholdersClosed, WindowObject} from './placeholder';
import {canRestoreProgrammatically, consolidateAppResponses, linkAppsToOriginalParentUuid, validatePayload} from './utils';
import {retargetForMonitors} from './monitor';

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

// A token unique to the current run of restoreWorkspace, needed so that we can correctly release the exclusivity token after a timeout if needed
let restoreExclusivityToken: {}|null = null;

interface AppToRestore {
    workspaceApp: WorkspaceApp;
    resolve: Function;
    timeout: number;
}

export const restoreWorkspace = async(payload: Workspace): Promise<Workspace> => {
    console.log('Restoring workspace:', payload);

    if (restoreExclusivityToken !== null) {
        throw new Error('Attempting to restore while restore in progress');
    }

    // Ensure the loader links any apps being programmatically restored with their parentUuid at time of workspace
    // generation, rather than their parentUuid now (which will be layouts-service)
    linkAppsToOriginalParentUuid(payload);

    validatePayload(payload);

    // Prevent the user from restoring a layout in the middle of a restoration.
    startExclusivityTimeout();

    const workspace = retargetForMonitors(payload);
    const startupApps: Promise<WorkspaceApp>[] = [];

    await createWorkspacePlaceholders(workspace);

    const apps: WorkspaceApp[] = await promiseMap(workspace.apps, app => restoreApp(app, startupApps));

    // Wait for all apps to start-up
    const startupResponses: WorkspaceApp[] = await Promise.all(startupApps);

    // Consolidate application responses
    const allAppResponses: WorkspaceApp[] = consolidateAppResponses(apps, startupResponses);

    // Go through all of the app responses and check them for failures. Exclude any apps that didn't come up from returned Workspace.
    const processedAppResponses: WorkspaceApp[] = await promiseFilter(allAppResponses, async (appResponse) => {
        return processAppResponse(appResponse, workspace);
    });

    workspace.apps = processedAppResponses;

    // Wait for all child windows to appear. Continue and Warn if placeholders aren't closed in 60 seconds.
    try {
        await waitUntilAllPlaceholdersClosed();
    } catch (error) {
        console.warn(error);
    }

    // If the user manually closed placeholder windows associated with tabbed windows, tab them if they're up.
    await restoreTabGroupsWithManuallyClosedPlaceholders(workspace);

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

export const appCanRestore = (uuid: string): boolean => {
    return allAppsEverReady.has(uuid);
};

export const appReadyForRestore = async(uuid: string): Promise<void> => {
    allAppsEverReady.set(uuid, true);

    const appToRestore = appsToRestoreWhenReady.get(uuid)!;

    if (appToRestore) {
        const {workspaceApp, resolve, timeout} = appToRestore;

        clearTimeout(timeout);
        appsToRestoreWhenReady.delete(uuid);
        sendWorkspaceToAppAndContinueRestore(workspaceApp, resolve);
    } else {
        console.warn('Ignoring duplicate \'appReadyForRestore\' call');
    }
};

const startExclusivityTimeout = (): void => {
    (() => {
        restoreExclusivityToken = {};
        const capturedRestoreExclusivityToken = restoreExclusivityToken;

        setTimeout(() => {
            if (capturedRestoreExclusivityToken === restoreExclusivityToken) {
                restorationCleanup();
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
            // If the app's main window is tabbed, create a tabbed placeholder window for it, otherwise, create a normal placeholder
            if (inWindowObject(app.mainWindow, tabbedWindows)) {
                await createTabbedPlaceholderAndRecord(app.mainWindow, tabbedPlaceholdersToWindows);
            } else {
                await createNormalPlaceholder(app.mainWindow);
            }
            // Do the same for child windows
            await childWindowPlaceholderCheck(app, tabbedWindows, tabbedPlaceholdersToWindows);
        }
    }

    // Kick off placeholder creation for all apps.
    await promiseMap(workspace.apps, createWorkspaceAppPlaceholders);

    const tabGroupsCopy = JSON.parse(JSON.stringify(workspace.tabGroups));

    // Edit the tabGroups object with the placeholder window names/uuids, so we can create a Tab Group with a combination of open applications and placeholder
    // windows.
    tabGroupsCopy.forEach((groupDef: TabGroup) => {
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

    await tabService.createTabGroupsFromWorkspace(tabGroupsCopy);
};

const restoreApp = async(app: WorkspaceApp, startupApps: Promise<WorkspaceApp>[]): Promise<WorkspaceApp> => {
    // Get rid of childWindows for default response (anything else?)
    const defaultResponse = {...app, childWindows: []};
    try {
        const {uuid} = app;
        console.log('Restoring App:', app);
        const ofApp = fin.Application.wrapSync({uuid});
        const isRunning = await ofApp.isRunning();
        if (isRunning) {
            const appConnected = apiHandler.channel.connections.some((conn: Identity) => conn.uuid === uuid && conn.name === uuid);
            if (appConnected) {
                await positionWindow(app.mainWindow, false);
                console.log('App is running:', app);
                // Send WorkspaceApp to connected application so it can handle child windows
                return await instructClientAppToRestoreItself(app);
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
                    setClientAppToRestoreWhenReady(app, resolve);
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
                // Application.run() can hang with createFromManifest calls, so we set a timeout to
                // continue restoration even if run() hangs.
                // We throw an exception to continue restoration, so take a look at the functions in our
                // catch to see how we handle it.
                await attemptToRunCreatedApp(ofAppNotRunning);
                await model.expect({uuid, name: uuid});
                await positionWindow(app.mainWindow, true);
            }
            // SHOULD WE RETURN DEFAULT RESPONSE HERE?!?
            return defaultResponse;
        }
    } catch (e) {
        console.error('Error restoring app', app, e);
        // App has failed to start. Let's mark it as such so we can delete it from the workspace later.
        deleteAppFromRestoreWhenReadyMap(app);
        return defaultResponse;
    }
};

// Check app response against appsToDeleteFromWorkspace to remove it from the Workspace and close its placeholders
// Check the app responses's child windows against the original child windows in WorkspaceApp, and close any hanging placeholders.
const processAppResponse = async(appResponse: WorkspaceApp, workspace: Workspace): Promise<boolean> => {
    if (appsToDeleteFromWorkspace.has(appResponse.uuid)) {
        console.error(`App launch for ${appResponse.uuid} failed. Application will be removed from workspace: `, appResponse);
        await closeCorrespondingPlaceholder(appResponse);
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
                    appResponse
                );
                await closeCorrespondingPlaceholder(childWindow);
            }
        });
        return true;
    }
};

const restoreTabGroupsWithManuallyClosedPlaceholders = async (workspace: Workspace) => {
    const manuallyClosedWindows = getWindowsWithManuallyClosedPlaceholders();
    if (manuallyClosedWindows.size === 0) {
        return;
    }

    const tabGroupsToRecreate: TabGroup[] = [];

    // Look for manually closed tabs and restore them
    for (const tabGroup of workspace.tabGroups) {
        // Find the tabs in this tabgroup with manually closed placeholders
        const manuallyClosedWindowsInTabGroup = tabGroup.tabs.filter(tab => manuallyClosedWindows.has(getId(tab)));
        if (manuallyClosedWindowsInTabGroup.length === 0) {
            continue;
        }

        // Find the existing tab group (if any) for these tabs to re-join
        let existingTabGroup: DesktopTabGroup|boolean|null = null;

        for (const tab of tabGroup.tabs) {
            const notManuallyClosed = !manuallyClosedWindows.has(getId(tab));
            const tabModel = notManuallyClosed && await model.expect(tab);
            existingTabGroup = tabModel && tabModel.tabGroup;
        }

        // We've found our TabGroup! Let's add all these windows to it.
        if (existingTabGroup) {
            // Re-add the ungrouped tabs back into the existing tab group if it exists
            const tabWindows = await promiseMap(manuallyClosedWindowsInTabGroup, async (tab) => model.expect(tab));
            await existingTabGroup.addTabs(tabWindows.filter(tabWindow => tabWindow.isReady));
            const activeTab = await model.expect(tabGroup.groupInfo.active);
            if (activeTab && activeTab.isReady) {
                await existingTabGroup.switchTab(activeTab);
            }
        } else {
            // If existingTabGroup doesn't exist, store to restore at the end
            tabGroupsToRecreate.push(tabGroup);
        }
    }

    await tabService.createTabGroupsFromWorkspace(tabGroupsToRecreate);
};

const restorationCleanup = (): void => {
    restoreExclusivityToken = null;
    cleanupPlaceholderObjects();
    appsToDeleteFromWorkspace.clear();
    appsToRestoreWhenReady.clear();
};

// Adds the WorkspaceApp object to a map, and waits for its corresponding application to come up.
// Once the application comes up, it is given that WorkspaceApp object to use for child window restoration.
// If the application never comes up, we resolve this hanging promise and nullify that application's child windows.
const setClientAppToRestoreWhenReady = (workspaceApp: WorkspaceApp, resolve: Function): void => {
    const {uuid} = workspaceApp;
    const failedResponse = {...workspaceApp, childWindows: [], confirmed: false};

    const timeout = window.setTimeout(() => {
        if (appsToRestoreWhenReady.delete(uuid)) {
            console.error(
                `App ${uuid} failed to call its ready function. 
                App is either not launching, or didn't call ready. 
                Application's child windows and confirmed status will be removed: `,
                workspaceApp
            );
            promiseForEach(workspaceApp.childWindows, closeCorrespondingPlaceholder);
            resolve(failedResponse);
        }
    }, CLIENT_APP_READY_TIMEOUT);

    const save = {workspaceApp, resolve, timeout};
    appsToRestoreWhenReady.set(uuid, save);
};

// Attempt to send the WorkspaceApp object to an application that has signalled that it's ready, and wait for it to respond back.
// If the message hangs, resolve this hanging promise with a modified WorkspaceApp object.
const instructClientAppToRestoreItself = async(workspaceApp: WorkspaceApp): Promise<WorkspaceApp> => {
    const identity = {uuid: workspaceApp.uuid, name: workspaceApp.uuid};

    const failedResponse = {...workspaceApp, childWindows: [], confirmed: false};
    let timeout: number;

    const sendToClientPromises =
        apiHandler.sendToClient<WorkspaceAPI.RESTORE_HANDLER, WorkspaceApp|false>(identity, WorkspaceAPI.RESTORE_HANDLER, workspaceApp);

    // Need to clear timeout once this responsePromise resolves.
    const responsePromise = sendToClientPromises.then((response: WorkspaceApp|false|undefined) => {
        if (timeout) {
            clearTimeout(timeout);
        }

        return response ? response : failedResponse;
    });

    const timeoutPromise = new Promise<WorkspaceApp>((resolve) => timeout = window.setTimeout(() => {
        console.error(
            `Sent WorkspaceApp object to ${workspaceApp.uuid}'s restore handler, but it timed out. 
            Child window restoration may have failed. 
            Application's child windows and confirmed status will be removed: `,
            workspaceApp
        );
        promiseForEach(workspaceApp.childWindows, closeCorrespondingPlaceholder);
        resolve(failedResponse);
    }, CLIENT_APP_RESTORE_TIMEOUT));

    try {
        const raceResult = await Promise.race([responsePromise, timeoutPromise]);
        return raceResult;
    } catch (error) {
        console.error('Error attempting to send workspace to client app: ', workspaceApp, error);
        return failedResponse;
    }
};

const attemptToRunCreatedApp = async (ofAppNotRunning: Application) => {
    let timeout;
    const timeoutPromise = new Promise<void>((resolve, reject) => timeout = window.setTimeout(() => {
        reject(new Error(`Run was called on Application ${ofAppNotRunning.identity.uuid}, but it seems to be hanging. Continuing restoration.`));
    }, CLIENT_APP_RUN_TIMEOUT));
    const runCall = ofAppNotRunning.run();

    await Promise.race([timeoutPromise, runCall]);

    clearTimeout(timeout);
};

// If an app creation fails during the beginning of the restore process, add it to appsToDeleteFromWorkspace so it can get cleaned up in the processAppResponse
// function. Then, resolve its pending setClientAppToRestoreWhenReady promise and remove it from appsToRestoreWhenReady.
const deleteAppFromRestoreWhenReadyMap = (app: WorkspaceApp) => {
    appsToDeleteFromWorkspace.add(app.uuid);
    const appThatFailedToRestore = appsToRestoreWhenReady.get(app.uuid);
    if (appThatFailedToRestore) {
        appsToRestoreWhenReady.delete(app.uuid);
        const {workspaceApp, resolve, timeout} = appThatFailedToRestore;
        clearTimeout(timeout);
        resolve(workspaceApp);
    }
};

const sendWorkspaceToAppAndContinueRestore = async(workspaceApp: WorkspaceApp, resolve: Function): Promise<void> => {
    const {uuid} = workspaceApp;
    const appConnection = apiHandler.isClientConnection({uuid, name: uuid});
    if (appConnection) {
        // Instruct app to restore its child windows
        const appworkspaceAppResult = await instructClientAppToRestoreItself(workspaceApp);

        resolve(appworkspaceAppResult);
    }
};
