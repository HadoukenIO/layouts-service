/**
 * @module Types
 */
import {MonitorInfo} from 'hadouken-js-adapter/out/types/src/api/system/monitor';
import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {WindowInfo} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';


/* Common */

/**
 * Interface used to identify window instances. Unlike `hadouken-js-adapter` types, the layouts service expects the
 * `name` field to be present on every identity object.
 *
 * For convenience, client functions are typed to take the `Identity` type rather than `WindowIdentity` in order to
 * prevent excessive casting. Any window identities returned by the service will always be of type `WindowIdentity`.
 */
export interface WindowIdentity {
    /**
     * Application identifier
     */
    uuid: string;

    /**
     * Window identifier
     */
    name: string;
}

// To be updated/moved once config story is fully merged. SERVICE-306
export interface IdentityRule {
    uuid: string|RegEx;
    name: string|RegEx;
}

export interface RegEx {
    expression: string;
    flags?: string;
    invert?: boolean;
}

/**
 * Window state, corresponds to `WindowOptions.state`
 */
export type WindowState = 'normal'|'minimized'|'maximized';


/* Tabbing */

/**
 * Represents the state of a tab within a tabstrip.
 *
 * These properties will be passed to the tabstrip whenever a tab is added. Tabstrips can also update these properties
 * at any time, and the service will persist these changes (See {@link updateTabProperties}).
 */
export interface TabProperties {
    /**
     * Tab title - the text that is shown on the tab widget so that a user can identify the contents of that tab.
     *
     * This will be initialised to the 'name' of the associated window object.
     */
    title: string;

    /**
     * URL to an icon image that will be displayed within the tab widget.
     */
    icon: string;
}

/**
 * Configuration options that can be set on a per-application basis, to control the tabbing behavior of any windows
 * belonging to that application.
 *
 * These parameters are set via the {@link setTabClient} API.
 */
export interface ApplicationUIConfig {
    /**
     * The URL of the tabstrip to use for any tab groups created by this application.
     */
    url: string;

    /**
     * The height of the tabstrip window referenced by 'url', in pixels.
     */
    height: number;
}


/* Workspaces */

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
 * Data passed as part of tabbing-related events
 */
export interface TabGroupEventPayload {
    /**
     * String that uniquely identifies the current tabset.
     */
    tabstripIdentity: WindowIdentity;

    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;
}

/**
 * Details of the {@link TabAddedEvent|'tab-added'} event
 */
export interface TabAddedPayload extends TabGroupEventPayload {
    /**
     * The properties of the newly-added tab.
     *
     * These will be generated from the `tabID` window, or will be whatever properties were previously set for the `tabID` window using
     * {@link updateTabProperties}.
     */
    properties: TabProperties;

    /**
     * The index at which the tab was inserted.
     *
     * An integer in the range `[0, <tab count>-1]`.
     */
    index: number;
}

/**
 * Details of the {@link TabPropertiesUpdatedEvent|'tab-properties-updated'} event
 */
export interface TabPropertiesUpdatedPayload {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;

    /**
     * New tab properties.
     *
     * This will always contain the full set of properties for the tab, even if only a subset of the properties were
     * updated in the {@link updateTabProperties} call.
     */
    properties: TabProperties;
}

export interface TabGroupRestoredPayload {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;
}

export interface TabGroupMinimizedPayload {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;
}

export interface TabGroupMaximizedPayload {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;
}
