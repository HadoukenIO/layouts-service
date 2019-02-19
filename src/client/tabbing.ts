/**
 * @module Tabbing
 */
import {Identity} from 'hadouken-js-adapter';

import {eventEmitter, tryServiceDispatch} from './connection';
import {AddTabPayload, getId, parseIdentity, SetTabstripPayload, TabAPI, UpdateTabPropertiesPayload} from './internal';
import {WindowIdentity} from './main';

/**
 * Details of the {@link addEventListener|'tab-activated'} event.
 *
 * Event fired whenever the active tab within a tab group is changed.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-activated', (event: TabGroupEvent) => {
 *     const activeTab = event.detail.identity;
 *     console.log("Active tab:", activeTab.uuid, activeTab.name);
 * });
 * ```
 *
 * @event
 */
export interface TabActivatedEvent {
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

    type: 'tab-activated';
}

/**
 * Details of the {@link addEventListener|'tab-removed'} event.
 *
 * Event fired whenever the current window is removed from it's previous tabset.
 *
 * To find out which other windows are in the tabset, use the `getTabs()` method.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-removed', async (event: TabGroupEvent) => {
 *     console.log("Window removed from tab group");
 * });
 * ```
 *
 * If a window is moved from one tab group to another, this will be messaged as a `tab-removed` event, followed by a `tab-added`.
 *
 * @event
 */
export interface TabRemovedEvent {
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

    type: 'tab-removed';
}

/**
 * Details of the {@link addEventListener|'tab-added'} event.
 *
 * Event fired whenever the current window is tabbed. This event is used when adding windows to both new and existing
 * tabsets.
 *
 * To find out which other windows are in the tabset, use the `getTabs()` method.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-added', async (event: TabAddedEvent) => {
 *     console.log("Window added to tab group: ", event.detail.identity);
 *     console.log("Windows in current group: ", await tabbing.getTabs());
 * });
 * ```
 *
 * If a window is moved from one tab group to another, this will be messaged as a `tab-removed` event, followed by a `tab-added`.
 *
 * @event
 */
export interface TabAddedEvent {
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

    type: 'tab-added';
}

/**
 * Details of the {@link addEventListener|'tab-properties-updated'} event.
 *
 * Event fired whenever a windows tab properties are {@link updateTabProperties|updated}.
 *
 * The event will always contain the full properties of the tab, even if only a subset of them were updated.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-properties-updated', (event: TabPropertiesUpdatedEvent) => {
 *     const tabID = event.detail.identity;
 *     const properties = event.detail.properties;
 *     console.log(`Properties for ${tabID.uuid}/${tabID.name} are:`, properties);
 * });
 * ```
 *
 * @event
 */
export interface TabPropertiesUpdatedEvent {
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

    type: 'tab-properties-updated';
}

/**
 * @hidden
 */
export type EventMap = TabAddedEvent|TabRemovedEvent|TabActivatedEvent|TabPropertiesUpdatedEvent;

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
 * These parameters are set via the {@link setTabstrip} API.
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



export function addEventListener(eventType: 'tab-added', listener: (event: TabAddedEvent) => void): void;
export function addEventListener(eventType: 'tab-removed', listener: (event: TabRemovedEvent) => void): void;
export function addEventListener(eventType: 'tab-activated', listener: (event: TabActivatedEvent) => void): void;
export function addEventListener(eventType: 'tab-properties-updated', listener: (event: TabPropertiesUpdatedEvent) => void): void;

export function addEventListener<K extends EventMap>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.addListener(eventType, listener);
}

export function removeEventListener(eventType: 'tab-added', listener: () => void): void;
export function removeEventListener(eventType: 'tab-removed', listener: () => void): void;
export function removeEventListener(eventType: 'tab-activated', listener: () => void): void;
export function removeEventListener(eventType: 'tab-properties-updated', listener: () => void): void;
export function removeEventListener<K extends EventMap>(eventType: K['type'], listener: () => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.removeListener(eventType, listener);
}

/**
 * Returns array of window identity references for tabs belonging to the tab group of the provided window context.
 *
 * If no `Identity` is provided as an argument, the current window context will be used.
 *
 * If there is no tab group associated with the window context, will resolve to null.
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Gets all tabs for the current window context.
 * tabbing.getTabs();
 *
 * // Get all tabs for another window context.
 * tabbing.getTabs({uuid: "sample-window-uuid", name: "sample-window-name"});
 * ```
 *
 * @param identity The window context, defaults to the current window.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function getTabs(identity: Identity = getId()): Promise<WindowIdentity[]|null> {
    return tryServiceDispatch<Identity, WindowIdentity[]|null>(TabAPI.GETTABS, {name: identity.name, uuid: identity.uuid});
}

/**
 * Creates the custom tabstrip + configuration for the entire application.  An application cannot have different windows using different tabstrip UIs.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.setTabstrip({url: 'https://localhost/customTabstrip.html', height: 60});
 * ```
 *
 * @param config The {@link ApplicationUIConfig| Application UI Configuration} object.
 * @throws `Promise.reject`: If `config` is not a valid {@link ApplicationUIConfig}
 * @throws `Promise.reject`: If `config.url` is not a valid URL/URI.
 */
export async function setTabstrip(config: ApplicationUIConfig): Promise<void> {
    if (!config || isNaN(config.height) || !config.url.length) {
        return Promise.reject('Invalid config provided');
    }

    try {
        // tslint:disable-next-line:no-unused-expression We're only checking a valid URL was provided.  No need to assign the resulting object.
        new URL(config.url);
    } catch (e) {
        return Promise.reject(e);
    }

    return tryServiceDispatch<SetTabstripPayload, void>(TabAPI.SETTABSTRIP, {id: getId(), config});
}

/**
 * Given a set of windows, will create a tab group construct and UI around them.  The bounds and positioning of the first (applicable) window in the set will be
 *
 * used as the seed for the tab UI properties.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.createTabGroup([{uuid: "App1", name: "App1"}, {uuid: "App2", name: "App2"}, {uuid: "App3", name: "App3"}]);
 * ```
 *
 * @param windows Array of windows which will be added to the new tab group.
 * @throws `Promise.reject`: If no windows is not an array or less than 2 windows were provided.
 */
export async function createTabGroup(windows: Identity[]): Promise<void> {
    return tryServiceDispatch<Identity[], void>(TabAPI.CREATETABGROUP, windows);
}

/**
 * Adds current window context (or window specified in second arg)  to the tab group of the target window (first arg).
 *
 * The added tab will be brought into focus.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Tab self to App1.
 * tabbing.addTab({uuid: 'App1', name: 'App1'});
 *
 * // Tab App2 to App1.
 * tabbing.addTab({uuid: 'App1', name: 'App1'}. {uuid: 'App2', name: 'App2'});
 * ```
 *
 * @param targetWindow The identity of the window to create a tab group on.
 * @param windowToAdd The identity of the window to add to the tab group.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If the {@link ApplicationUIConfig| App Config} does not match between the target and window to add.
 * @throws `Promise.reject`: If the `targetWindow` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If the `windowToAdd` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function addTab(targetWindow: Identity, windowToAdd: Identity = getId()): Promise<void> {
    return tryServiceDispatch<AddTabPayload, void>(TabAPI.ADDTAB, {targetWindow: parseIdentity(targetWindow), windowToAdd: parseIdentity(windowToAdd)});
}

/**
 * Removes the specified window context from its tab group.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Remove the current context from its tab group.
 * tabbing.removeTab();
 *
 * // Remove another window from its tab group.
 * tabbing.removeTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to remove.  If no `Identity` is provided as an argument, the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function removeTab(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.REMOVETAB, parseIdentity(identity));
}

/**
 * Sets the window context as the active tab in its tab group.  Active tabs are brought to the front of the tab group and shown.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts'
 *
 * // Sets the current window as active in the tab group.
 * tabbing.setActiveTab()
 *
 * // Sets another window context as the active tab.
 * tabbing.setActiveTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to set as active.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function setActiveTab(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.SETACTIVETAB, parseIdentity(identity));
}

/**
 * Closes the tab for the window context and removes it from its associated tab group.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Closes the current window context tab.
 * tabbing.closeTab();
 *
 * // Closes another windows context tab.
 * tabbing.closeTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to close.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function closeTab(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.CLOSETAB, parseIdentity(identity));
}

/**
 * Minimizes the tab group for the window context.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Minimizes the tab group for the current window context.
 * tabbing.minimizeTabGroup();
 *
 * // Minimizes the tab group for another windows context.
 * tabbing.minimizeTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to minimize the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function minimizeTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.MINIMIZETABGROUP, parseIdentity(identity));
}

/**
 * Maximizes the tab group for the window context.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Minimizes the tab group for the current window context.
 * tabbing.maxmimizeTabGroup();
 *
 * // Minimizes the tab group for another windows context.
 * tabbing.maximizeTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to maximize the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function maximizeTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.MAXIMIZETABGROUP, parseIdentity(identity));
}

/**
 * Closes the tab group for the window context.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Closes the tab group for the current window context.
 * tabbing.closeTabGroup();
 *
 * // Closes the tab group for another windows context.
 * tabbing.closeTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to close the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function closeTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.CLOSETABGROUP, parseIdentity(identity));
}

/**
 * Restores the tab group for the window context to its normal state.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Restores the tab group for the current window context.
 * tabbing.restoreTabGroup();
 *
 * // Restores the tab group for another windows context.
 * tabbing.restoreTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to restore the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If `identity` is not an existing tab in a tabstrip.
 */
export async function restoreTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.RESTORETABGROUP, parseIdentity(identity));
}

/**
 * Updates a tab's Properties on the Tab strip.  This includes the tabs title and icon.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Updating only some properties for the current window context.
 * tabbing.updateTabProperties({title: 'An Awesome Tab!'});
 *
 * // Update all properties for the current window context.
 * tabbing.updateTabProperties({title: 'An Awesome Tab!', icon: 'http://openfin.co/favicon.ico'});
 *
 * // Update properties for another windows context.
 * tabbing.updateTabProperties({title: 'An Awesome Tab'}, {uuid: 'App1', name: 'App1'});
 * ```
 * @param properties Properties object for the tab to consume.
 * @param identity Identity of the window context set the properties on.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function updateTabProperties(properties: Partial<TabProperties>, identity: Identity = getId()): Promise<void> {
    if (!properties) {
        throw new Error('Properties are required');
    }
    return tryServiceDispatch<UpdateTabPropertiesPayload, void>(TabAPI.UPDATETABPROPERTIES, {window: parseIdentity(identity), properties});
}
