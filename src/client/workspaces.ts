/**
 * @module Workspaces
 */
import {Identity} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import {MonitorInfo} from 'hadouken-js-adapter/out/types/src/api/system/monitor';
import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {WindowInfo} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {channelPromise, eventEmitter, tryServiceDispatch} from './connection';
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
    type: 'layout';

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
     * This data has some overlap with that stored withing `apps` and `apps.mainWindow`/`apps.childWindows`. Generally,
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
     * The URL of the manifest from which this application was started.
     *
     * This is only present if the application was started from a manifest. For applications started programatically
     * (using the OpenFin API), `initialOptions` will be present instead.
     */
    manifestUrl?: string;

    /**
     * Stores key information from the Application constructor parameters that were passed when this application was
     * started.
     *
     * This is only present if the application was started programatically. For applications started from a manifest,
     * `manifestUrl` will be present instead.
     */
    initialOptions?: fin.ApplicationOptions;

    /**
     * Application identifier
     */
    uuid: string;

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
     * To set customData, register a 'save' callback using {@link onApplicationSave}. The provided function will be
     * called whenever a workspace is generated, and any value returned by that function will be added to the workspace here.
     * This data will then be available within the restore callback registered via {@link onAppRestore}.
     */
    customData?: CustomData;
}

/**
 * Stores the state of a single window within a saved workspace.
 */
export interface WorkspaceWindow extends Bounds, WindowIdentity {
    /**
     * If the window is currently visible, corresponds to `Window.isShowing()`.
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
     * Additional window metadata, corresponds to `Window.getInfo()`
     */
    info: WindowInfo;

    /**
     * A list of windows currently docked to this one.
     *
     * These groupings will be restored once all windows in the workspace have been re-created.
     */
    windowGroup: Identity[];

    /**
     * Window state, corresponds to `WindowOptions.state`
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
     * The saved state of these windows exists within the {@link Layout.apps} hierarchy.
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
     * Object containing the tabstrip configuration
     */
    config: ApplicationUIConfig|'default';

    /**
     * The state the TabGroup and contained windows are mimicing
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
 * Details of the {@link addEventListener|'workspace-restored'} event
 *
 * Event fired when a workspace is {@link restore|restored}.
 *
 * The event will contain the full detail of the {@link Workspace}.
 *
 * ```ts
 * import {workspaces} from 'openfin-layouts';
 *
 * workspaces.addEventListener('workspace-restored', async (event: WorkspaceRestoredEvent) => {
 *      console.log(`Properties for the restored workspace: ${event.detail}`);
 * });
 * ```
 * @event
 */
export interface WorkspaceRestoredEvent {
    workspace: Workspace;
    type: 'workspace-restored';
}

/**
 * Details of the {@link addEventListener|'workspace-generated'} event.
 *
 * Event fired whenever a workspace is {@link generate|generated}.
 *
 * The event will contain the full detail of the {@link Workspace}.
 *
 * ```ts
 * import {workspaces} from 'openfin-layouts';
 *
 * workspaces.addEventListener('workspace-generated', async (event: WorkspaceGeneratedEvent) => {
 *     console.log(`Properties for the generated workspace: ${event.detail}`);
 * });
 * ```
 *
 * @event
 */
export interface WorkspaceGeneratedEvent {
    workspace: Workspace;
    type: 'workspace-generated';
}

/**
 * @hidden
 */
export type EventMap = WorkspaceRestoredEvent|WorkspaceGeneratedEvent;

export function addEventListener(eventType: 'workspace-restored', listener: (event: WorkspaceRestoredEvent) => void): void;
export function addEventListener(eventType: 'workspace-generated', listener: (event: WorkspaceGeneratedEvent) => void): void;
export function addEventListener<K extends EventMap>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.addListener(eventType, listener);
}

export function removeEventListener(eventType: 'workspace-restored', listener: () => void): void;
export function removeEventListener(eventType: 'workspace-generated', listener: () => void): void;
export function removeEventListener<K extends EventMap>(eventType: K['type'], listener: () => void): void {
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
 */
export async function setGenerateHandler(customDataDecorator: () => CustomData): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register(WorkspaceAPI.GENERATE_HANDLER, customDataDecorator);
}

/**
 * Registers a callback that will restore the application to a previous state.
 *
 * It is up to applications whether this action should "append" or "replace" the current workspace. The service will not
 * close any applications that are currently open and not in the workspace; though applications may do this if they wish.
 */
export async function setRestoreHandler(listener: (layoutApp: WorkspaceApp) => WorkspaceApp | false | Promise<WorkspaceApp|false>): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register(WorkspaceAPI.RESTORE_HANDLER, listener);
}


/**
 * Generates a JSON object that contains the state of the current desktop.
 *
 * The returned JSON will contain the main application window of every application that is currently open and hasn't
 * explicitly de-registered itself using the layouts service API. Child windows will not be included by default - the
 * returned workspace object will only contain child window data for applications that integrate with the layouts service
 * by registering {@link setGenerateHandler|save} and {@link setRestoreHandler|restore} callbacks.
 *
 * TODO: Document workspace generation process
 */
export async function generate(): Promise<Workspace> {
    return tryServiceDispatch<undefined, Workspace>(WorkspaceAPI.GENERATE_LAYOUT);
}

/**
 * Takes a workspace created by {@link generate} and restores the applications within it.
 *
 * The returned JSON will contain the main application window of every application that is currently open and hasn't
 * explicitly de-registered itself using the layouts service API. Child windows will not be included by default - the
 * returned workspace object will only contain child window data for applications that integrate with the layouts service
 * by registering {@link setGenerateHandler|save} and {@link setRestoreHandler|restore} callbacks.
 *
 * TODO: Document workspace restoration process
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
 */
export async function ready(): Promise<Workspace> {
    return tryServiceDispatch<undefined, Workspace>(WorkspaceAPI.APPLICATION_READY);
}
