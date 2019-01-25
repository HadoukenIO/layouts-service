/**
 * @module Home
 */
import {tryServiceDispatch} from './connection';
import {getId, RegisterAPI} from './internal';
import {undockGroup, undockWindow} from './snapanddock';
import {addTab, closeTab, closeTabGroup, createTabGroup, getTabs, JoinTabGroupPayload, maximizeTabGroup, TabGroupEventPayload, TabPropertiesUpdatedPayload} from './tabbing';
import {minimizeTabGroup, removeTab, restoreTabGroup, setActiveTab, setTabstrip, tabStrip, updateTabProperties} from './tabbing';
import {Workspace} from './types';
import {generateWorkspace, ready, restoreWorkspace, setRestoreHandler, setSaveHandler} from './workspaces';

export {undockGroup, undockWindow};
export {addTab, closeTab, closeTabGroup, createTabGroup, getTabs, maximizeTabGroup};
export {minimizeTabGroup, removeTab, restoreTabGroup, setActiveTab, setTabstrip, tabStrip, updateTabProperties};
export {generateWorkspace, ready, restoreWorkspace, setRestoreHandler, setSaveHandler};

/**
 * @hidden
 */
export interface EventMap {
    'join-snap-group': JoinSnapGroupEvent;
    'leave-snap-group': LeaveSnapGroupEvent;
    'join-tab-group': JoinTabGroupEvent;
    'leave-tab-group': LeaveTabGroupEvent;
    'tab-activated': TabActivatedEvent;
    'tab-properties-updated': TabPropertiesUpdatedEvent;
    'workspace-restored': WorkspaceRestoredEvent;
    'workspace-saved': WorkspaceSavedEvent;
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
 * Allows a window to opt-out of this service.
 *
 * This will disable *all* layouts-related functionality for the given window.
 *
 * @param identity The window to deregister, defaults to the current window
 */
export async function deregister(identity: IdentityRule = getId() as IdentityRule): Promise<void> {
    return tryServiceDispatch<IdentityRule, void>(RegisterAPI.DEREGISTER, identity);
}

/**
 * Allows a window to opt-in to this service.
 *
 * This will enable *all* layouts-related functionality for the given window.
 *
 * @param identity The window to register, defaults to the current window
 */
export async function register(identity: IdentityRule): Promise<void> {
    throw new Error('Method not implemented');
}


/**
 * Registers a listener for any events raised by the service.
 *
 * @param eventType Event to be subscribed to. Valid options are 'join-snap-group' and 'leave-snap-group'
 * @param listener Function to be executed on event firing.
 */
export async function addEventListener<K extends keyof EventMap>(eventType: K, listener: (event: EventMap[K]) => void): Promise<void> {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(eventType, listener as EventListener);
}



/**
 * Event fired when one window is docked to another.
 *
 * It is not possible to receive events for another window. When adding a listener, the listener will only ever fire for the "`fin.desktop.Window.getCurrent()`"
 * window.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('join-snap-group', async (event: Event) => {
 *     console.log("Docked to another window");
 *
 *     // Using 'v1' API
 *     fin.desktop.Window.getCurrent().getGroup((windows) => {
 *         console.log("Windows in current group: ", windows);
 *     });
 *
 *     // Using 'v2' API
 *     console.log("Windows in current group: ", await fin.Window.getCurrentSync().getGroup());
 * });
 * ```
 *
 * The service considers any windows that are tabbed together to also be in the same snap group, so this event will also fire when a window is added to a tab
 * group. This may change in future versions of the service.
 *
 * @type join-snap-group
 * @event
 */
export type JoinSnapGroupEvent = Event&{type: 'join-snap-group'};

/**
 * Event fired when one window is undocked from it's neighbor(s).
 *
 * It is not possible to receive events for another window. When adding a listener, the listener will only ever fire for the "`fin.desktop.Window.getCurrent()`"
 * window.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('leave-snap-group', async (event: Event) => {
 *     console.log("Undocked from another window");
 *
 *     // Using 'v1' API
 *     fin.desktop.Window.getCurrent().getGroup((windows) => {
 *         console.log("Windows in current group: ", windows);
 *     });
 *
 *     // Using 'v2' API
 *     console.log("Windows in current group: ", await fin.Window.getCurrentSync().getGroup());
 * });
 * ```
 *
 * The service considers any windows that are tabbed together to also be in the same snap group, so this event will also fire when a window is removed from a
 * tab group. This may change in future versions of the service.
 *
 * @type leave-snap-group
 * @event
 */
export type LeaveSnapGroupEvent = Event&{type: 'leave-snap-group'};

/**
 * Event fired whenever the current window is tabbed. This event is used when adding windows to both new and existing
 * tabsets.
 *
 * To find out which other windows are in the tabset, use the `getTabs()` method.
 *
 * ```ts
 * import {addEventListener, getTabs} from 'openfin-layouts';
 *
 * addEventListener('join-tab-group', async (event: CustomEvent<JoinTabGroupPayload>) => {
 *     console.log("Window added to tab group");
 *     console.log("Windows in current group: ", await getTabs());
 * });
 * ```
 *
 * If a window is moved from one tab group to another, this will be messaged as a `leave-tab-group` event, followed by a `join-tab-group`.
 *
 * @type join-tab-group
 * @event
 */
export type JoinTabGroupEvent = CustomEvent<JoinTabGroupPayload>&{type: 'join-tab-group'};

/**
 * Event fired whenever the current window is removed from it's previous tabset.
 *
 * To find out which other windows are in the tabset, use the `getTabs()` method.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('leave-tab-group', async (event: Event) => {
 *     console.log("Window removed from tab group");
 * });
 * ```
 *
 * If a window is moved from one tab group to another, this will be messaged as a `leave-tab-group` event, followed by a `join-tab-group`.
 *
 * @type leave-tab-group
 * @event
 */
export type LeaveTabGroupEvent = CustomEvent<TabGroupEventPayload>&{type: 'leave-tab-group'};

/**
 * Event fired whenever the active tab within a tab group is changed.
 *
 * ```ts
 * import {addEventListener, getTabs} from 'openfin-layouts';
 *
 * addEventListener('tab-activated', async (event: Event) => {
 *     const activeTab = event.detail.tabID;
 *     console.log("Active tab:", activeTab.uuid, activeTab.name);
 * });
 * ```
 *
 * NOTE: This event is only passed to tabstrip windows, and not to the actual application windows within the tabset.
 *
 * @type tab-activated
 * @event
 */
export type TabActivatedEvent = CustomEvent<TabGroupEventPayload>&{type: 'tab-activated'};

/**
 * Event fired whenever a tabs properties are updated (via {@link updateTabProperties}).
 *
 * The event will always contain the full properties of the tab, even if only a subset of them were updated.
 *
 * ```ts
 * import {addEventListener, getTabs} from 'openfin-layouts';
 *
 * addEventListener('tab-properties-updated', async (event: CustomEvent<TabPropertiesUpdatedPayload>) => {
 *     const tabID = event.detail.tabID;
 *     const properties = event.detail.properties;
 *     console.log(`Properties for ${tabID.uuid}/${tabID.name} are:`, properties);
 * });
 * ```
 *
 * @type tab-properties-updated
 * @event
 */
export type TabPropertiesUpdatedEvent = CustomEvent<TabPropertiesUpdatedPayload>&{type: 'tab-properties-updated'};


/**
 * Event fired whenever a workspace is restored (via {@link restoreWorkspace}).
 *
 * The event will contain the full detail of the Workspace. ({@link Workspace}).
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('workspace-restored', async (event: CustomEvent<LayoutA>) => {
 *      console.log(`Properties for the restored workspace: ${event.detail}`);
 * });
 * ```
 *
 * @type workspace-restored
 * @event
 */
export type WorkspaceRestoredEvent = CustomEvent<Workspace>&{type: 'workspace-restored'};

/**
 * Event fired whenever a workspace is saved (via {@link generateWorkspace}).
 *
 * The event will contain the full detail of the Workspace. ({@link Workspace}).
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('workspace-saved', async (event: CustomEvent<Layout>) => {
 *     console.log(`Properties for the saved workspace: ${event.detail}`);
 * });
 * ```
 *
 * @type workspace-saved
 * @event
 */
export type WorkspaceSavedEvent = CustomEvent<Workspace>&{type: 'workspace-saved'};
