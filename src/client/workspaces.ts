/**
 * @module Workspaces
 */
import {Identity} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import {MonitorInfo} from 'hadouken-js-adapter/out/types/src/api/system/monitor';
import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';

import {eventEmitter, getServicePromise, tryServiceDispatch} from './connection';
import {WorkspaceAPI} from './internal';
import {WindowIdentity} from './main';
import {ApplicationUIConfig} from './tabbing';


/**
 * Defines a saved workspace, containing the state of any applications that were open at the time the workspace was
 * generated.
 *
 * See {@link generate} for more information about what gets captured when saving a workspace. Previously generated
 * workspace can be restored using {@link restore}.
 */
export interface Workspace {
    /**
     * Identifies this object as being a workspace.
     */
    type: 'workspace';

    /**
     * Used to determine compatibility of generated workspaces when restoring on different versions of the service.
     *
     * Any workspace JSON produced by the service will contain a schema version number. This is a separate version number
     * from the service itself, and is incremented only on any changes to the JSON format.
     *
     * The version string follows [semver conventions](https://semver.org), and any breaking changes to the schema will
     * always coincide with a major version increment.
     */
    schemaVersion: string;

    /**
     * Stores details about any connected monitors.
     *
     * Note: This data isn't yet used by the service, it is here to allow for future improvements to the workspaces
     * feature.
     */
    monitorInfo: MonitorInfo;

    /**
     * List of all applications within the workspace.
     */
    apps: WorkspaceApp[];

    /**
     * Tracks which windows are tabbed together, and the properties of the associated tabstrip windows.
     *
     * This data has some overlap with that stored within `apps` and `apps.mainWindow`/`apps.childWindows`. Generally,
     * `apps` holds the state necessary for restoring individual application windows, and `tabGroups` ensures the
     * windows are correctly placed into tab groups once they have been created.
     */
    tabGroups: TabGroup[];
}

/**
 * Stores the state of a single application within a saved workspace.
 */
export interface WorkspaceApp {
    /**
     * Application identifier
     */
    uuid: string;

    /**
     * The URL of the manifest from which this application was started.
     *
     * This is only present if the application was started from a manifest. For applications started programmatically
     * (using the OpenFin API), `initialOptions` will be present instead.
     */
    manifestUrl?: string;

    /**
     * Stores key information from the Application constructor parameters that were passed when this application was
     * started.
     *
     * This is only present if the application was started programmatically. For applications started from a manifest,
     * `manifestUrl` will be present instead.
     *
     * The [type](http://cdn.openfin.co/jsdocs/stable/fin.desktop.Application.html#~options) of this matches the
     * options passed to `fin.Application.create` and those returned by `Application.getOptions()`.
     */
    initialOptions?: object;

    /**
     * The UUID of the application that initially launched this app.
     *
     * This is only present if the application was started programmatically.
     */
    parentUuid?: string;

    /**
     * State of the main window of the application.
     */
    mainWindow: WorkspaceWindow;

    /**
     * State of any child windows belonging to the application.
     *
     * This will only be populated if the application integrates with the Layouts Service API. See
     * {@link generate} for details.
     */
    childWindows: WorkspaceWindow[];

    /**
     * Flag used within the service to confirm an application has correctly implemented the callbacks it has
     * registered.
     *
     * @hidden
     */
    confirmed?: boolean;

    /**
     * Applications can add their own custom data to a workspace, to assist with correctly restoring the application when
     * a saved workspace is loaded.
     *
     * To set customData, register a 'save' callback using {@link setGenerateHandler}. The provided function will be
     * called whenever a workspace is generated, and any value returned by that function will be added to the workspace here.
     * This data will then be available within the restore callback registered via {@link setRestoreHandler}.
     */
    customData?: CustomData;
}

/**
 * Stores the state of a single window within a saved workspace.
 */
export interface WorkspaceWindow extends WindowIdentity {
    /**
     * The full URL of the window, corresponds to the `url` property of `Window.getInfo()`
     */
    url: string;

    /**
     * If the window is currently visible, corresponds to `Window.isShowing()`
     */
    isShowing: boolean;

    /**
     * Window state, corresponds to `WindowOptions.state`
     */
    state: WindowState;

    /**
     * If the window is framed or frameless, corresponds to `WindowOptions.frame`
     */
    frame: boolean;

    /**
     * Physical position of the window, corresponds to `Window.getBounds()`.
     *
     * This object will always contain all fields, even those marked as optional in the `getBounds()` response.
     */
    bounds: Required<Bounds>;

    /**
     * A list of windows currently docked to this one.
     *
     * These groupings will be restored once all windows in the workspace have been re-created.
     */
    windowGroup: Identity[];

    /**
     * Indicates if the window is part of a tab group.
     *
     * Tab group information is stored separately in `Workspace.tabGroups`. This flag indicates that the current window
     * will be a part of that data.
     */
    isTabbed: boolean;
}

/**
 * Semantic type definition, used in any place where applications can attach their own custom data to a workspace.
 */
export type CustomData = {}|null|undefined;

/**
 * Window state, corresponds to `WindowOptions.state`
 */
export type WindowState = 'normal'|'minimized'|'maximized';

/**
 * Defines a set of tabbed windows within a saved workspace.
 *
 * Lists the windows that are tabbed together, and the state of the tabstrip window that joins them together.
 */
export interface TabGroup {
    /**
     * State of the tabstrip window that groups the application windows together
     */
    groupInfo: TabGroupInfo;

    /**
     * Defines which application windows exist within this tab group.
     *
     * The saved state of these windows exists within the {@link Workspace.apps | list of applications}.
     */
    tabs: WindowIdentity[];
}

/**
 * Saved state of a tabstrip window
 */
export interface TabGroupInfo {
    /**
     * The identity of the currently active tab. Will be one of the identities within {@link TabGroup.tabs}.
     */
    active: WindowIdentity;

    /**
     * Object containing the saved bounds of the tabset
     */
    dimensions: TabGroupDimensions;

    /**
     * Object containing the tabstrip configuration, or a string indicating that this group uses the default tabstrip
     */
    config: ApplicationUIConfig|'default';

    /**
     * The window state of the TabGroup as a whole, including both the tabstrip and its tabs
     */
    state: WindowState;
}

/**
 * Combined dimensions of a tabset
 */
export interface TabGroupDimensions {
    /**
     * Pixel co-ordinate of the left edge of the tab group
     */
    x: number;

    /**
     * Pixel co-ordinate of the top edge of the tab group
     */
    y: number;

    /**
     * Width of the tab group.
     *
     * This width is used by both the tabstrip and the tabbed application windows.
     */
    width: number;

    /**
     * The pixel height of the application windows within this tabset.
     *
     * The total height of the entire tabset is this plus {@link TabGroupInfo.config.height}.
     */
    appHeight: number;
}

/**
 * Event fired when a workspace is {@link restore|restored}.  See {@link addEventListener}.
 *
 * ```ts
 * import {workspaces} from 'openfin-layouts';
 * import {Workspace} from 'openfin-layouts/dist/client/workspaces';
 *
 * workspaces.addEventListener('workspace-restored', async (event: WorkspaceRestoredEvent) => {
 *      const workspace: Workspace = event.workspace;
 *      console.log('Workspace restored:', workspace);
 * });
 * ```
 * @event
 */
export interface WorkspaceRestoredEvent {
    type: 'workspace-restored';

    /**
     * Workspace that has just been restored by the service.
     */
    workspace: Workspace;
}

/**
 * Event fired whenever a workspace is {@link generate|generated}.  See {@link addEventListener}.
 *
 * ```ts
 * import {workspaces} from 'openfin-layouts';
 * import {Workspace} from 'openfin-layouts/dist/client/workspaces';
 *
 * workspaces.addEventListener('workspace-generated', async (event: WorkspaceGeneratedEvent) => {
 *      const workspace: Workspace = event.workspace;
 *      console.log('Workspace generated:', workspace);
 * });
 * ```
 *
 * @event
 */
export interface WorkspaceGeneratedEvent {
    type: 'workspace-generated';

    /**
     * Workspace that has just been generated by the service.
     */
    workspace: Workspace;
}

/**
 * @hidden
 */
export type WorkspacesEvent = WorkspaceRestoredEvent|WorkspaceGeneratedEvent;

export function addEventListener(eventType: 'workspace-restored', listener: (event: WorkspaceRestoredEvent) => void): void;
export function addEventListener(eventType: 'workspace-generated', listener: (event: WorkspaceGeneratedEvent) => void): void;
export function addEventListener<K extends WorkspacesEvent>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.addListener(eventType, listener);
}

export function removeEventListener(eventType: 'workspace-restored', listener: (event: WorkspaceRestoredEvent) => void): void;
export function removeEventListener(eventType: 'workspace-generated', listener: (event: WorkspaceGeneratedEvent) => void): void;
export function removeEventListener<K extends WorkspacesEvent>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.removeListener(eventType, listener);
}

/**
 * Register a callback that will save the state of the calling application.
 *
 * The callback will be invoked on each call to {@link generate}, and the return value (if anything is returned)
 * will be saved as the workspace's `customData` property for this app within the generated {@link Workspace}.
 * 
 * ``` ts
 * import {workspaces} from 'openfin-layouts';
 * 
 * workspaces.setGenerateHandler(() => {
 *     // Return custom data
 *     return {currentStockSymbol: this._currentStockSymbol};
 * });
 * ```
 * 
 */
export async function setGenerateHandler(customDataDecorator: () => CustomData): Promise<boolean> {
    const channel: ChannelClient = await getServicePromise();
    return channel.register(WorkspaceAPI.GENERATE_HANDLER, customDataDecorator);
}

/**
 * Registers a callback that will restore the application to a previous state.
 *
 * If an application has set a {@link setRestoreHandler} callback, and called the {@link ready} function, the layouts service
 * will send it its Workspace data when the {@link restore} function is called, and wait for this function to return. If
 * an application has saved its child windows, it *MUST* create those child windows with the same names defined in its
 * Workspace. If those child windows are already up, position them in their proper location using the bounds given.
 *
 * If this function does not return, or this function does not create the app's child windows appropriately,
 * {@link restore} will hang indefinitely.
 *
 * If the callback does not return a WorkspaceApp object, window grouping will be affected. The {@link restore} function reads
 * the return value and uses it to continue restoration.
 *
 * It is recommended that you restore/position the child windows defined in workspaceApp, and after those windows have been created, return
 * that same workspaceApp object.
 *
 * ``` ts
 * import {workspaces} from 'openfin-layouts';
 * import {Workspace} from 'openfin-layouts/dist/client/workspaces';
 * 
 * async function appRestoreHandler(workspaceApp: Workspace) {
 *     const ofApp = await fin.Application.getCurrent();
 *     const openWindows = await ofApp.getChildWindows();
 *     // Iterate through the child windows of the workspaceApp data
 *     const opened = workspaceApp.childWindows.map(async (childWinInfo, index) => {
 *         // Check for existence of the window
 *         let openChildWin = openWindows.find(w => w.identity.name === childWinInfo.name);
 *         if (!openChildWin) {
 *             openChildWin = await openChild(childWinInfo.name, childWinInfo.info.url);
 *         }
 *         // Create the OpenFin window with the same name
 *         // Position the window based on the data in the workspaceApp
 *         // The user provides this positioning function
 *         await positionWindow(childWinInfo, openChildWin);
 *     });
 * 
 *     // Wait for all windows to open and be positioned before returning
 *     await Promise.all(opened);
 *     return layoutApp;
 * }
 * 
 * workspaces.setRestoreHandler(appRestoreHandler);
 * ```
 */
export async function setRestoreHandler(listener: (workspaceApp: WorkspaceApp) => WorkspaceApp | false | Promise<WorkspaceApp|false>): Promise<boolean> {
    const channel: ChannelClient = await getServicePromise();
    return channel.register(WorkspaceAPI.RESTORE_HANDLER, listener);
}


/**
 * Generates a JSON Workspace object that contains the state of the current desktop.
 *
 * The returned JSON will contain information for the main window of every application that is currently open and hasn't
 * explicitly de-registered itself from the service. It will also contain positioning, tabbing and grouping information
 * for each application. This data will be passed to {@link restore}, which will create the applications and
 * position them appropriately.
 *
 * If an application wishes to restore its child windows and store custom data, it must properly integrate with the
 * layouts service by both registering {@link setGenerateHandler|generate} and {@link setRestoreHandler|restore} callbacks, and
 * calling the {@link ready} function. If this is not done properly, workspace restoration may be disrupted.
 * 
 * ``` ts
 * import {workspaces} from 'openfin-layouts';
 *
 * async function saveCurrentWorkspace {
 *    const workspaceObject = await workspaces.generate();
 *    // Persist the workspaceObject in a location of your choosing
 *    saveWorkspace(workspaceObject);
 *    return workspaceObject;
 * }
 * ```
 * 
 */
export async function generate(): Promise<Workspace> {
    return tryServiceDispatch<undefined, Workspace>(WorkspaceAPI.GENERATE_LAYOUT);
}

/**
 * Takes a Workspace object created by the {@link generate} function and restores the state of the desktop at the time it was generated
 *
 * Restoration begins by reading the Workspace object, and determining what applications and windows are running or not.
 *
 * If an application or child window is not up and running, the layouts service will create a transparent placeholder window for it, as an
 * indication to the user that a window is in the process of loading. The placeholder window will listen for its corresponding window to
 * come up, and subsequently close itself.
 *
 * Once all placeholder windows are up, the layouts service will ungroup and un-tab any windows participating in restoration. This is done to
 * prevent a window from dragging its group around the desktop, into a location that wasn't originally intended. Restore does not touch
 * any windows that were not declared in the Workspace object.
 *
 * Once all windows are ungrouped, the layouts service will then tab together all windows involved in a tabgroup. Placeholder windows are
 * included in this tabbing step. Once a placeholder window's corresponding restored window comes up, that restored window takes
 * the place of the placeholder window in the tabset.
 *
 * Once all groups have been set up, the layouts service will then begin opening and positioning the applications and windows.
 *
 * If an application is up and running, the layouts service will position it in its proper place. If the application isn't running,
 * the layouts service will attempt to launch it after it has been launched. It is then positioned.
 *
 * If the application has registered {@link setGenerateHandler|generate} and {@link setRestoreHandler|restore} callbacks, and called
 * the {@link ready} function, the layouts service will send it its Workspace data. If an application has saved its child windows,
 * it *MUST* create those child windows with the same names defined in its Workspace. If it does not do so, {@link restore} will fail.
 *
 * Once all applications and child windows have been spun up and positioned, and all placeholder windows have been closed, the layouts
 * service will then group all windows that were formerly snapped together.
 *
 * Finally, the layouts service will send a 'workspace-restored' event to all windows, and complete restoration.
 * 
 * ``` ts
 * import {workspaces} from 'openfin-layouts';
 * 
 * workspaces.restore(workspaceObject).then(result => {
 *    // Promise resolves with result once the layout has been restored
 *    handleResult(result)
 * });
 * ```
 * 
 */
export async function restore(payload: Workspace): Promise<Workspace> {
    return tryServiceDispatch<Workspace, Workspace>(WorkspaceAPI.RESTORE_LAYOUT, payload);
}

/**
 * Send this to the service when you have registered all routes after registration.
 *
 * When restoring a workspace, the service will refrain from passing the saved workspace to the application (via the
 * {@link setRestoreHandler} callback) until after the application has used this function to signal that it is ready.
 *
 * Note that by not calling this function, and workspace {@link restore} operation will hang
 * indefinitely.
 * 
 * ``` ts
 * import {workspaces} from 'openfin-layouts';
 *
 * workspaces.setRestoreHandler(someRestoreFunction);
 * workspaces.setGenerateHandler(someGenerateFunction);
 * workspaces.ready();
 * ```
 * 
 */
export async function ready(): Promise<Workspace> {
    return tryServiceDispatch<undefined, Workspace>(WorkspaceAPI.APPLICATION_READY);
}
