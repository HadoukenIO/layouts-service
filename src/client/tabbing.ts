/**
 * @module Tabbing
 */
import {Identity} from 'hadouken-js-adapter';

import {tryServiceDispatch} from './connection';
import {AddTabPayload, getId, parseIdentity, SetTabstripPayload, TabAPI, UpdateTabPropertiesPayload} from './internal';
import {ApplicationUIConfig, TabProperties, WindowIdentity} from './types';


/**
 * Returns array of window identity references for tabs belonging to the tab group of the provided window context.
 *
 * If no `Identity` is provided as an argument, the current window context will be used.
 *
 * If there is no tab group associated with the window context, will resolve to null.
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Gets all tabs for the current window context.
 * Layouts.tabbing.getTabs();
 *
 * // Get all tabs for another window context.
 * Layouts.tabbing.getTabs({uuid: "sample-window-uuid", name: "sample-window-name"});
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
 * import * as Layouts from 'openfin-layouts';
 *
 * Layouts.tabbing.setTabstrip({url: 'https://localhost/customTabstrip.html', height: 60});
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
 * import * as Layouts from 'openfin-layouts';
 *
 * Layouts.tabbing.createTabGroup([{uuid: "App1", name: "App1"}, {uuid: "App2", name: "App2"}, {uuid: "App3", name: "App3"}]);
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
 * import * as Layouts from 'openfin-layouts';
 *
 * // Tab self to App1.
 * Layouts.tabbing.addTab({uuid: 'App1', name: 'App1'});
 *
 * // Tab App2 to App1.
 * Layouts.tabbing.addTab({uuid: 'App1', name: 'App1'}. {uuid: 'App2', name: 'App2'});
 * ```
 *
 * @param targetWindow The identity of the window to create a tab group on.
 * @param windowToAdd The identity of the window to add to the tab group.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If the {@link ApplicationUIConfig| App Config} does not match between the target and window to add.
 * @throws `Promise.reject`: If the `targetWindow` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Promise.reject`: If the `windowToAdd` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function addTab(targetWindow: Identity, windowToAdd: Identity = getId()): Promise<void> {
    return tryServiceDispatch<AddTabPayload, void>(TabAPI.ADDTAB, {targetWindow: parseIdentity(targetWindow), windowToAdd: parseIdentity(windowToAdd)});
}

/**
 * Removes the specified window context from its tab group.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Remove the current context from its tab group.
 * Layouts.tabbing.removeTab();
 *
 * // Remove another window from its tab group.
 * Layouts.tabbing.removeTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to remove.  If no `Identity` is provided as an argument, the current window context will be used.
 * @throws `Promise.reject`:  If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function removeTab(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.REMOVETAB, parseIdentity(identity));
}

/**
 * Sets the window context as the active tab in its tab group.  Active tabs are brought to the front of the tab group and shown.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts'
 *
 * // Sets the current window as active in the tab group.
 * Layouts.tabbing.setActiveTab()
 *
 * // Sets another window context as the active tab.
 * Layouts.tabbing.setActiveTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to set as active.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function setActiveTab(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.SETACTIVETAB, parseIdentity(identity));
}

/**
 * Closes the tab for the window context and removes it from its associated tab group.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Closes the current window context tab.
 * Layouts.tabbing.closeTab();
 *
 * // Closes another windows context tab.
 * Layouts.tabbing.closeTab({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to close.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function closeTab(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.CLOSETAB, parseIdentity(identity));
}

/**
 * Minimizes the tab group for the window context.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Minimizes the tab group for the current window context.
 * Layouts.tabbing.minimizeTabGroup();
 *
 * // Minimizes the tab group for another windows context.
 * Layouts.tabbing.minimizeTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to minimize the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function minimizeTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.MINIMIZETABGROUP, parseIdentity(identity));
}

/**
 * Maximizes the tab group for the window context.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Minimizes the tab group for the current window context.
 * Layouts.tabbing.maxmimizeTabGroup();
 *
 * // Minimizes the tab group for another windows context.
 * Layouts.tabbing.maximizeTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to maximize the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function maximizeTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.MAXIMIZETABGROUP, parseIdentity(identity));
}

/**
 * Closes the tab group for the window context.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Closes the tab group for the current window context.
 * Layouts.tabbing.closeTabGroup();
 *
 * // Closes the tab group for another windows context.
 * Layouts.tabbing.closeTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to close the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function closeTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.CLOSETABGROUP, parseIdentity(identity));
}

/**
 * Restores the tab group for the window context to its normal state.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Restores the tab group for the current window context.
 * Layouts.tabbing.restoreTabGroup();
 *
 * // Restores the tab group for another windows context.
 * Layouts.tabbing.restoreTabGroup({uuid: 'App1', name: 'App1'});
 * ```
 *
 * @param identity Identity of the window context to restore the tab group for.  If no `Identity` is provided as an argument the current window context will be
 * used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function restoreTabGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.RESTORETABGROUP, parseIdentity(identity));
}

/**
 * Updates a tab's Properties on the Tab strip.  This includes the tabs title and icon.
 *
 * ```ts
 * import * as Layouts from 'openfin-layouts';
 *
 * // Updating only some properties for the current window context.
 * Layouts.tabbing.updateTabProperties({title: 'An Awesome Tab!'});
 *
 * // Update all properties for the current window context.
 * Layouts.tabbing.updateTabProperties({title: 'An Awesome Tab!', icon: 'http://openfin.co/favicon.ico'});
 *
 * // Update all properties for another windows context.
 * Layouts.tabbing.updateTabProperties({title: 'An Awesome Tab'}, {uuid: 'App1', name: 'App1'});
 * ```
 * @param properties Properties object for the tab to consume.
 * @param identity Identity of the window context set the properties on.  If no `Identity` is provided as an argument the current window context will be used.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function updateTabProperties(properties: Partial<TabProperties>, identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<UpdateTabPropertiesPayload, void>(TabAPI.UPDATETABPROPERTIES, {window: parseIdentity(identity), properties});
}
