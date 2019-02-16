/**
 * @module Tabstrip
 */
import {Identity} from 'hadouken-js-adapter';

import {tryServiceDispatch} from './connection';
import {StartDragPayload, TabAPI, parseIdentity} from './internal';
/**
 * Functions required to implement a tabstrip
 */

/**
 * Starts the HTML5 Dragging Sequence
 */
export async function startDrag(window: Identity) {
    // Previous client version had no payload. To avoid breaking changes, the service
    // will default to the active tab if no window is specified. Here we just check that
    // if a window was provided,it is valid
    if (window && (!window.name || !window.uuid)) {
        throw new Error('Invalid window provided');
    }

    return tryServiceDispatch<StartDragPayload, void>(TabAPI.STARTDRAG, {window});
}

/**
 * Informs the layouts service the HTML5 drag sequence has ended.  Required at the end of any tabstrip drag operation.
 * 
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 * 
 * window.document.body.addEventListener("dragend", (event) => {
 *      tabstrip.endDrag();
 * })
 * ```
 */
export async function endDrag() {
    return tryServiceDispatch<void, void>(TabAPI.ENDDRAG);
}

/**
 * Updates the layouts service provider with the new order of tabs in a tabstrip.  Required for workspace restore operations to restore the tabs in the correct order.
 * The length of the provided array must match the current number of tabs, and each current tab must appear in the
 * array exactly once to be valid.
 * 
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 * 
 * const tabs = [{uuid: 'App0', name: 'App0'}, {uuid: 'App1', name: 'App1'}, {uuid: 'App2', name: 'App2'}];
 * 
 * tabstrip.reorderTabs(tabs);
 * ```
 * 
 * @param newOrder The new order of the tabs.  First index in the array will match the first tab in the strip.
 * @throws `Promise.reject`: If the provided value is not an array.
 * @throws `Promise.reject`: If not all tabs present in the tabstrip are in the provided array.
 */
export async function reorderTabs(newOrder: Identity[]): Promise<void> {
    return tryServiceDispatch<Identity[], void>(TabAPI.REORDERTABS, newOrder.map(identity => parseIdentity(identity)));
}