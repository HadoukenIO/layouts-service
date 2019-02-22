/**
 * @module Tabbing
 */
import {Identity} from 'hadouken-js-adapter';

import {eventEmitter, tryServiceDispatch} from './connection';
import {AddTabPayload, CreateTabGroupPayload, getId, parseIdentity, SetTabstripPayload, TabAPI, UpdateTabPropertiesPayload} from './internal';
import {WindowIdentity} from './main';

/**
 * Event fired whenever the active tab within a tab group is changed.  See {@link addEventListener}.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-activated', (event: TabGroupEvent) => {
 *     const activeTab = event.identity;
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
     */
    identity: WindowIdentity;

    type: 'tab-activated';
}

/**
 * Event fired whenever the current window is removed from it's previous tabset.  See {@link addEventListener}.
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
     */
    identity: WindowIdentity;

    type: 'tab-removed';
}

/**
 * Event fired whenever the current window is tabbed. This event is used when adding windows to both new and existing
 * tabsets.  See {@link addEventListener}.
 *
 * To find out which other windows are in the tabset, use the `getTabs()` method.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-added', async (event: TabAddedEvent) => {
 *     console.log("Window added to tab group: ", event.identity);
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
     */
    identity: WindowIdentity;
    /**
     * The properties of the newly-added tab.
     *
     * These will be generated from the `identity` window, or will be whatever properties were previously set for the `identity` window using
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
 * Event fired whenever a windows tab properties are {@link updateTabProperties|updated}.  See {@link addEventListener}.
 *
 * The event will always contain the full properties of the tab, even if only a subset of them were updated.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.addEventListener('tab-properties-updated', (event: TabPropertiesUpdatedEvent) => {
 *     const tabIdentity = event.identity;
 *     const properties = event.properties;
 *     console.log(`Properties for ${tabIdentity.uuid}/${tabIdentity.name} are:`, properties);
 * });
 * ```
 *
 * @event
 */
export interface TabPropertiesUpdatedEvent {
    /**
     * Identifies the window that is the source of the current event.
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

export function removeEventListener(eventType: 'tab-added', listener: (event: TabAddedEvent) => void): void;
export function removeEventListener(eventType: 'tab-removed', listener: (event: TabRemovedEvent) => void): void;
export function removeEventListener(eventType: 'tab-activated', listener: (event: TabActivatedEvent) => void): void;
export function removeEventListener(eventType: 'tab-properties-updated', listener: (event: TabPropertiesUpdatedEvent) => void): void;
export function removeEventListener<K extends EventMap>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.removeListener(eventType, listener);
}

/**
 * Returns array of window identity references for tabs belonging to the tab group of the provided window context.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
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
 * @throws `Error`: If `config` is not a valid {@link ApplicationUIConfig}
 * @throws `Error`: If `config.url` is not a valid URL/URI.
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
 * Creates a tabgroup with the provided windows.  The first window in the set will be used to define the tab strips properties.  See {@link setTabstrip}.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * tabbing.createTabGroup([{uuid: "App1", name: "App1"}, {uuid: "App2", name: "App2"}, {uuid: "App3", name: "App3"}]);
 * ```
 *
 * @param identities Array of window {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identities} which will be added to the
 * new tab group.
 * @param activeTab The {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity} of the window to set as the active tab in
 * the group.  If not provided, the first tab in the tab group will be set as the active tab.
 * @throws `Error`: If one of the provided {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identities} is not valid.
 * @throws `Error`: If duplicate {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identities} are provided.
 * @throws `Error`: If the provided value is not an array or less than 2 windows identities were provided.
 */
export async function createTabGroup(identities: Identity[], activeTab?: Identity): Promise<void> {
    const onlyIdentities = identities.map(id => parseIdentity(id));
    const active = activeTab && parseIdentity(activeTab) || undefined;
    return tryServiceDispatch<CreateTabGroupPayload, void>(TabAPI.CREATETABGROUP, {windows: onlyIdentities, activeTab: active});
}

/**
 * Tabs two windows together.  If the targetWindow is already in a group, the tab will be added to that group.
 *
 * The added tab will be brought into focus.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Tab App1 to App2
 * tabbing.tabWindowToWindow({uuid: 'App1', name: 'App1'}, {uuid: 'App2', name: 'App2'});
 * ```
 *
 * @param windowToAdd The identity of the window to add to the tab group.
 * @param targetWindow The identity of the window to create a tab group on.
 * @throws `Error`: If the {@link ApplicationUIConfig| App Config} does not match between the target and window to add.
 * @throws `Error`: If the `targetWindow` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If the `windowToAdd` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function tabWindowToWindow(windowToAdd: Identity, targetWindow: Identity): Promise<void> {
    return tryServiceDispatch<AddTabPayload, void>(TabAPI.TAB_WINDOW_TO_WINDOW, {targetWindow: parseIdentity(targetWindow), windowToAdd: parseIdentity(windowToAdd)});
}

/**
 * Removes the specified window context from its tab group.  This does not close the window.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Remove the window from its tab group.
 * tabbing.removeTab();
 *
 * // Remove another window from its tab group.
 * tabbing.removeTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to remove.  If no `Identity` is provided as an argument, the current window context will be used.
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If `identity` is not an existing tab in a tabstrip.
 */
export async function restoreTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.RESTORETABGROUP, parseIdentity(identity));
}

/**
 * Updates a tab's properties. Properties for a tab include its title and icon when in a tab group.
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
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function updateTabProperties(properties: Partial<TabProperties>, identity: Identity = getId()): Promise<void> {
    if (!properties) {
        throw new Error('Properties are required');
    }
    return tryServiceDispatch<UpdateTabPropertiesPayload, void>(TabAPI.UPDATETABPROPERTIES, {window: parseIdentity(identity), properties});
}

/**
 * Adds the provided window context as a tab to the current window context.
 *
 * The added tab will be brought into focus.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Tab App2 to current window.
 * tabbing.tabToSelf({uuid: 'App2', name: 'App2'});
 * ```
 *
 * @param Identity The identity of the window to add as a tab.
 * @throws `Error`: If the {@link ApplicationUIConfig| App Config} does not match between the window to add and the current window context.
 * @throws `Error`: If the `Identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If the `Identity` matches the calling windows `Identity`.
 */
export async function tabToSelf(identity: Identity) {
    return tryServiceDispatch<AddTabPayload, void>(TabAPI.TAB_WINDOW_TO_WINDOW, {targetWindow: getId(), windowToAdd: parseIdentity(identity)});
}

/**
 * Adds the current window context as a tab to the provided window context.
 *
 * The added tab will be brought into focus.
 *
 * ```ts
 * import {tabbing} from 'openfin-layouts';
 *
 * // Tab current window to App1.
 * tabbing.tabSelfTo({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param Identity The identity of the window to add the current window context as a tab to.
 * @throws `Error`: If the {@link ApplicationUIConfig| App Config} does not match between the window to add and the current window context.
 * @throws `Error`: If the `Identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If the `Identity` matches the calling windows `Identity`.
 */
export async function tabSelfTo(identity: Identity) {
    return tryServiceDispatch<AddTabPayload, void>(TabAPI.TAB_WINDOW_TO_WINDOW, {targetWindow: parseIdentity(identity), windowToAdd: getId()});
}
