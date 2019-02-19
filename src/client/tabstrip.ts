/**
 * @module Tabstrip
 */
import {Identity} from 'hadouken-js-adapter';

import {eventEmitter, tryServiceDispatch} from './connection';
import {parseIdentity, TabAPI} from './internal';
import {WindowIdentity} from './main';
/**
 * Functions required to implement a tabstrip
 */


/**
 * Details of the {@link addEventListener|'tab-group-restored'} event.
 *
 * Fired when a tab group is restored from being maximized or minimized..  See {@link addEventListener}.
 *
 * ```ts
 * tabstrip.addEventListener('tab-group-restored', (event: TabGroupRestoredEvent) => {
 *     const tabGroupID = event.detail.identity;
 *     console.log(`Tab group restored: ${tabGroupID.uuid}/${tabGroupID.name}`);
 * });
 * ```
 *
 * @event
 */
export interface TabGroupRestoredEvent {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;

    type: 'tab-group-restored';
}

/**
 * Details of the {@link addEventListener|'tab-group-minimized'} event.
 *
 * Event fired whenever the current tab group is minimized.  See {@link addEventListener}.
 *
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 *
 * tabstrip.addEventListener('tab-group-minimized', (event: TabGroupMinimizedEvent) => {
 *     const tabGroupID = event.detail.identity;
 *     console.log(`Tab group minimized: ${tabGroupID.uuid}/${tabGroupID.name}`);
 * });
 * ```
 *
 * @event
 */
export interface TabGroupMinimizedEvent {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;

    type: 'tab-group-minimized';
}

/**
 * Details of the {@link addEventListener|'tab-group-maximized'} event.
 *
 * Fired when the current tab group is maximized.  See {@link addEventListener}.
 *
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 *
 * tabstrip.addEventListener('tab-group-maximized', (event: TabGroupMaximizedEvent) => {
 *     const tabGroupID = event.detail.identity;
 *     console.log(`Tab group maximized: ${tabGroupID.uuid}/${tabGroupID.name}`);
 * });
 * ```
 *
 * @event
 */
export interface TabGroupMaximizedEvent {
    /**
     * Identifies the window that is the source of the current event.
     *
     * See the documentation for individual events for more details.
     */
    identity: WindowIdentity;

    type: 'tab-group-maximized';
}

/**
 * @hidden
 */
export type EventMap = TabGroupRestoredEvent|TabGroupMinimizedEvent|TabGroupMaximizedEvent;


/**
 * @type tab-group-restored
 */
export async function addEventListener(eventType: 'tab-group-restored', listener: (event: TabGroupRestoredEvent) => void): Promise<void>;

/**
 * @type tab-group-minimized
 */
export async function addEventListener(eventType: 'tab-group-minimized', listener: (event: TabGroupMinimizedEvent) => void): Promise<void>;

/**
 * @type tab-group-minimized
 */
export async function addEventListener(eventType: 'tab-group-maximized', listener: (event: TabGroupMaximizedEvent) => void): Promise<void>;

export async function addEventListener<K extends EventMap>(eventType: K['type'], listener: (event: K) => void): Promise<void> {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.addListener(eventType, listener);
}

/**
 * Informs the layouts service a tab HTML5 drag sequence has begun.  Required at the beginning of any tabstrip drag operation.
 * Only one dragging operation should ever be taking place.
 *
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 *
 * window.document.body.addEventListener("dragstart", (event) => {
 *      tabstrip.startDrag({uuid: 'App0', name: 'App0'});
 * });
 * ```
 *
 * @param identity: The identity of the tab which is being dragged.
 * @throws `Promise.reject`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 */
export async function startDrag(identity: Identity): Promise<void> {
    return tryServiceDispatch<Identity, void>(TabAPI.STARTDRAG, parseIdentity(identity));
}

/**
 * Informs the layouts service a tab HTML5 drag sequence has ended.  Required at the end of any tabstrip drag operation.
 * Only one dragging operation should ever be taking place.
 *
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 *
 * window.document.body.addEventListener("dragend", (event) => {
 *      tabstrip.endDrag();
 * })
 * ```
 */
export async function endDrag(): Promise<void> {
    return tryServiceDispatch<void, void>(TabAPI.ENDDRAG);
}

/**
 * Updates the layouts service provider with the new order of tabs in a tabstrip.  Required for workspace restore operations to restore the tabs in the correct
 * order.
 *
 * This call is purely informational and will not trigger any events.
 *
 * The length of the provided array must match the current number of tabs, and each current tab must appear in the array exactly once to be valid.
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
 * @throws `Promise.reject`: If array item type `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity |
 * Identity}.
 * @throws `Promise.reject`: If not all tabs present in the tabstrip are in the provided array.
 * @throws `Promise.reject`: If array item is not in the calling tab group.
 */
export async function reorderTabs(newOrder: Identity[]): Promise<void> {
    return tryServiceDispatch<Identity[], void>(TabAPI.REORDERTABS, newOrder.map(identity => parseIdentity(identity)));
}