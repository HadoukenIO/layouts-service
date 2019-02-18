/**
 * @module Tabstrip
 */
import {Identity} from 'hadouken-js-adapter';

import {tryServiceDispatch} from './connection';
import {DropPosition, EndDragPayload, StartDragPayload, TabAPI} from './internal';
import {TabGroupMaximizedPayload, TabGroupMinimizedPayload, TabGroupRestoredPayload} from './types';
/**
 * Functions required to implement a tabstrip
 */

/**
 * Fired when a tab group is restored.  See {@link addEventListener}.
 */
export interface TabGroupRestoredEvent extends CustomEvent<TabGroupRestoredPayload> {
    type: 'tab-group-restored';
}

/**
 * Fired when a tab group is minimized.  See {@link addEventListener}.
 */
export interface TabGroupMinimizedEvent extends CustomEvent<TabGroupMinimizedPayload> {
    type: 'tab-group-minimized';
}

/**
 * Fired when a tab group is maximized.  See {@link addEventListener}.
 */
export interface TabGroupMaximizedEvent extends CustomEvent<TabGroupMaximizedPayload> {
    type: 'tab-group-maximized';
}

/**
 * @hidden
 */
export interface EventMap {
    'tab-group-restored': TabGroupRestoredEvent;
    'tab-group-minimized': TabGroupMinimizedEvent;
    'tab-group-maximized': TabGroupMaximizedEvent;
}

/**
 * Event fired whenever the current tab group is restored from being maximized or minimized.
 *
 * ```ts
 * import {tabstrip} from 'openfin-layouts';
 *
 * tabstrip.addEventListener('tab-group-restored', (event: TabGroupRestoredEvent) => {
 *     const tabGroupID = event.detail.identity;
 *     console.log(`Tab group restored: ${tabGroupID.uuid}/${tabGroupID.name}`);
 * });
 * ```
 *
 * @type tab-group-restored
 * @event
 */
export async function addEventListener(eventType: 'tab-group-restored', listener: (event: TabGroupRestoredEvent) => void): Promise<void>;

/**
 * Event fired whenever the current tab group is minimized.
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
 * @type tab-group-minimized
 * @event
 */
export async function addEventListener(eventType: 'tab-group-minimized', listener: (event: TabGroupMinimizedEvent) => void): Promise<void>;

/**
 * Event fired whenever the current tab group is maximized.
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
 * @type tab-group-minimized
 * @event
 */
export async function addEventListener(eventType: 'tab-group-maximized', listener: (event: TabGroupMaximizedEvent) => void): Promise<void>;

export async function addEventListener<K extends keyof EventMap>(eventType: K, listener: (event: EventMap[K]) => void): Promise<void> {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(eventType, listener as EventListener);
}

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
 * Ends the HTML5 Dragging Sequence.
 */
export async function endDrag(event: DragEvent, window: Identity) {
    if (!event) {
        throw new Error('Event is required');
    }
    if (!window || !window.name || !window.uuid) {
        throw new Error('Invalid window provided');
    }

    const dropPoint: DropPosition = {screenX: event.screenX, screenY: event.screenY};
    return tryServiceDispatch<EndDragPayload, void>(TabAPI.ENDDRAG, {event: dropPoint, window});
}

/**
 * Resets the tabs to the order provided.  The length of tabs Identity array must match the current number of tabs, and each current tab must appear in the
 * array exactly once to be valid.  If the input isn’t valid, the call will reject and no change will be made.
 */
export async function reorderTabs(newOrdering: Identity[]): Promise<void> {
    if (!newOrdering || newOrdering.length === 0) {
        throw new Error('Invalid new Order array');
    }

    return tryServiceDispatch<Identity[], void>(TabAPI.REORDERTABS, newOrdering);
}