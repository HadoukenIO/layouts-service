/**
 * @module Tabbing
 */
import {Identity} from 'hadouken-js-adapter';

import {tryServiceDispatch} from './connection';
import {AddTabPayload, getId, SetTabstripPayload, TabAPI, UpdateTabPropertiesPayload} from './internal';
import {ApplicationUIConfig, TabProperties, WindowIdentity} from './types';


/**
 * Returns array of window references for tabs belonging to the tab group of the provided window context.
 *
 * If no Identity is provided as an argument, the current window context will be used.
 *
 * If there is no tab group associated with the window context, will resolve to null.
 */
export async function getTabs(window: Identity = getId()): Promise<WindowIdentity[]|null> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, WindowIdentity[]|null>(TabAPI.GETTABS, window);
}

/**
 * If a custom tab-strip UI is being used - this sets the URL for the tab-strip.
 * This binding happens on the application level.  An application cannot have different windows using different tabbing UI.
 */
export async function setTabstrip(config: ApplicationUIConfig): Promise<void> {
    if (!config || isNaN(config.height!)) {
        return Promise.reject('Invalid config height provided');
    }

    try {
        // tslint:disable-next-line:no-unused-expression
        new URL(config.url);
    } catch (e) {
        return Promise.reject(e);
    }

    return tryServiceDispatch<SetTabstripPayload, void>(TabAPI.SETTABSTRIP, {id: getId(), config});
}

/**
 * Given a set of windows, will create a tab group construct and UI around them.  The bounds and positioning of the first (applicable) window in the set will be
 * used as the seed for the tab UI properties.
 */
export async function createTabGroup(windows: Identity[]): Promise<void> {
    if (!windows || windows.length === 0) {
        return Promise.reject('Invalid window identity array');
    }

    return tryServiceDispatch<Identity[], void>(TabAPI.CREATETABGROUP, windows);
}

/**
 * Adds current window context (or window specified in second arg)  to the tab group of the target window (first arg).
 *
 * Will reject with an error if the TabClient of the target and context tab group do not match.
 *
 * The added tab will be brought into focus.
 */
export async function addTab(targetWindow: Identity, windowToAdd: Identity = getId()): Promise<void> {
    if (!targetWindow || !targetWindow.uuid || !targetWindow.name) {
        return Promise.reject('Invalid targetWindow provided');
    }
    if (!windowToAdd || !windowToAdd.name || !windowToAdd.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<AddTabPayload, void>(TabAPI.ADDTAB, {targetWindow, windowToAdd});
}

/**
 * Removes the specified tab from its tab group.
 * Uses current window context by default
 */
export async function removeTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.REMOVETAB, window);
}

/**
 * Brings the specified tab to the front of the set.
 */
export async function setActiveTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.SETACTIVETAB, window);
}

/**
 * Closes the tab for the window context and removes it from the associated tab group.
 */
export async function closeTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.CLOSETAB, window);
}

/**
 * Minimizes the tab group for the window context.
 */
export async function minimizeTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.MINIMIZETABGROUP, window);
}

/**
 * Maximizes the tab group for the window context.
 */
export async function maximizeTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.MAXIMIZETABGROUP, window);
}

/**
 * Closes the tab group for the window context.
 */
export async function closeTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.CLOSETABGROUP, window);
}

/**
 * Restores the tab group for the window context to its normal state.
 */
export async function restoreTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<Identity, void>(TabAPI.RESTORETABGROUP, window);
}

/**
 * Updates a Tabs Properties on the Tab strip.
 */
export async function updateTabProperties(window: Identity, properties: Partial<TabProperties>): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }

    return tryServiceDispatch<UpdateTabPropertiesPayload, void>(TabAPI.UPDATETABPROPERTIES, {window, properties});
}
