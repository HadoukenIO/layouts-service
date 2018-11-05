/**
 * @module Home
 */
import {Identity} from 'hadouken-js-adapter';

import {tryServiceDispatch} from './connection';
import {getId, JoinTabGroupPayload, TabGroupEventPayload} from './internal';
import {undockGroup, undockWindow} from './snapanddock';
import {addTab, closeTab, closeTabGroup, createTabGroup, getTabs, maximizeTabGroup} from './tabbing';
import {minimizeTabGroup, removeTab, restoreTabGroup, setActiveTab, setTabClient, tabStrip} from './tabbing';
import {generateLayout, onApplicationSave, onAppRestore, onLayoutRestore, onLayoutSave, ready, restoreLayout} from './workspaces';

export {undockGroup, undockWindow};
export {addTab, closeTab, closeTabGroup, createTabGroup, getTabs, maximizeTabGroup};
export {minimizeTabGroup, removeTab, restoreTabGroup, setActiveTab, setTabClient, tabStrip};
export {generateLayout, onApplicationSave, onAppRestore, onLayoutRestore, onLayoutSave, ready, restoreLayout};

if (typeof fin === 'undefined') {
    throw new Error('fin is not defined, This module is only intended for use in an OpenFin application.');
}

/**
 * Allows a window to opt-out of this service.
 *
 * This will disable *all* layouts-related functionality for the given window.
 *
 * @param identity The window to deregister, defaults to the current window
 */
export async function deregister(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>('deregister', identity);
}

/**
 * Registers a listener for any events raised by the service.
 *
 * @param eventType Event to be subscribed to. Valid options are 'join-snap-group' and 'leave-snap-group'
 * @param callback Function to be executed on event firing. Takes no arguments and returns void.
 */
export async function addEventListener<K extends keyof EventMap>(type: K, listener: (event: EventMap[K]) => void): Promise<void> {
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(type, listener as EventListener);
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
 * @name join-snap-group
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
 * @name leave-snap-group
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
 * addEventListener('join-tab-group', async (event: Event) => {
 *     console.log("Window added to tab group");
 *     console.log("Windows in current group: ", await getTabs());
 * });
 * ```
 *
 * If a window is moved from one tab group to another, this will be messaged as a `leave-tab-group` event, followed by a `join-tab-group`.
 *
 * @name join-tab-group
 * @event
 */
export type JoinTabGroupEvent = CustomEvent<JoinTabGroupPayload>&{type: 'join-tab-group'};

/**
 * Event fired whenever the current window is removed from it's previous tabset.
 *
 * To find out which other windows are in the tabset, use the `getTabs()` method.
 *
 * ```ts
 * import {addEventListener, getTabs} from 'openfin-layouts';
 *
 * addEventListener('leave-tab-group', async (event: Event) => {
 *     console.log("Window removed from tab group");
 * });
 * ```
 *
 * If a window is moved from one tab group to another, this will be messaged as a `leave-tab-group` event, followed by a `join-tab-group`.
 *
 * @name leave-tab-group
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
 * @name tab-activated
 * @event
 */
export type TabActivatedEvent = CustomEvent<TabGroupEventPayload>&{type: 'tab-activated'};

/**
 * @hidden
 */
export interface EventMap {
    'join-snap-group': JoinSnapGroupEvent;
    'leave-snap-group': LeaveSnapGroupEvent;
    'join-tab-group': JoinTabGroupEvent;
    'leave-tab-group': LeaveTabGroupEvent;
    'tab-activated': TabActivatedEvent;
}
