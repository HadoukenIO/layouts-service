/**
 * @module Tabstrip
 */
import {tryServiceDispatch} from './connection';
import { TabAPI, DropPosition, EndDragPayload } from './internal';
import { Identity } from 'hadouken-js-adapter';
/**
 * Functions required to implement a tabstrip
 */

    /**
     * Starts the HTML5 Dragging Sequence
     */
    export async function startDrag() {
        return tryServiceDispatch<undefined, void>(TabAPI.STARTDRAG);
    }

    /**
     * Ends the HTML5 Dragging Sequence.
     */
    export async function endDrag(event: DragEvent, window: Identity) {
        if (!window || !window.name || !window.uuid) {
            return Promise.reject('Invalid window provided');
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
            return Promise.reject('Invalid new Order array');
        }

        return tryServiceDispatch<Identity[], void>(TabAPI.REORDERTABS, newOrdering);
    }