/**
 * @module Home
 */
import {tryServiceDispatch} from './connection';
import {getId, RegisterAPI} from './internal';
import * as snapAndDock from './snapanddock';
import * as tabbing from './tabbing';
import * as tabstrip from './tabstrip';
import {JoinTabGroupPayload, TabGroupEventPayload, TabPropertiesUpdatedPayload, Workspace, IdentityRule} from './types';
import * as workspaces from './workspaces';

export {snapAndDock, tabbing, tabstrip, workspaces};

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
 * Allows a window to opt-in back to this service if previously deregistered.
 *
 * This will enable *all* layouts-related functionality for the given window unless alternative behaviors are set in the layout configuration.
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
 * import {addEventListener, tabbing} from 'openfin-layouts';
 *
 * addEventListener('join-tab-group', async (event: CustomEvent<JoinTabGroupPayload>) => {
 *     console.log("Window added to tab group: ", event.detail.identity);
 *     console.log("Windows in current group: ", await tabbing.getTabs());
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
 * import {addEventListener} from 'openfin-layouts';
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
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('tab-properties-updated', async (event: CustomEvent<TabPropertiesUpdatedPayload>) => {
 *     const tabID = event.detail.identity;
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
 * Event fired whenever a workspace is restored (via {@link restore}).
 *
 * The event will contain the full detail of the ({@link Workspace}).
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('workspace-restored', async (event: CustomEvent<Workspace>) => {
 *      console.log(`Properties for the restored workspace: ${event.detail}`);
 * });
 * ```
 *
 * @type workspace-restored
 * @event
 */
export type WorkspaceRestoredEvent = CustomEvent<Workspace>&{type: 'workspace-restored'};

/**
 * Event fired whenever a workspace is saved (via {@link generate}).
 *
 * The event will contain the full detail of the ({@link Workspace}).
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('workspace-saved', async (event: CustomEvent<Workspace>) => {
 *     console.log(`Properties for the saved workspace: ${event.detail}`);
 * });
 * ```
 *
 * @type workspace-saved
 * @event
 */
export type WorkspaceSavedEvent = CustomEvent<Workspace>&{type: 'workspace-saved'};
