/**
 * @module SnapAndDock
 */
import {Identity} from 'hadouken-js-adapter';

import {eventEmitter, tryServiceDispatch} from './connection';
import {getId, parseIdentity, SnapAndDockAPI} from './internal';
import {WindowIdentity} from './main';

/**
 * Event fired when one window is docked to another.  See {@link addEventListener}.
 *
 * It is not possible to receive events for another window. When adding a listener, the listener will only ever fire for the "`fin.desktop.Window.getCurrent()`"
 * window.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 * import {WindowDockedEvent} from 'openfin-layouts/dist/client/snapanddock';
 *
 * addEventListener('window-docked', async (event: WindowDockedEvent) => {
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
 * This event is fired when the window first becomes docked. The window will not receive an event if an additional
 * window is added to the group later.
 *
 * @event
 */
export interface WindowDockedEvent {
    type: 'window-docked';
}

/**
 * Event fired when one window is undocked from it's neighbor(s).  See {@link addEventListener}.
 *
 * It is not possible to receive events for another window. When adding a listener, the listener will only ever fire for the "`fin.desktop.Window.getCurrent()`"
 * window.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 * import {WindowUndockedEvent} from 'openfin-layouts/dist/client/snapanddock';
 *
 * addEventListener('window-undocked', async (event: WindowUndockedEvent) => {
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
 * This event is fired when the current window becomes undocked from a group. A window will not receive this event if
 * another window within the same group is undocked.
 *
 * @event
 */
export interface WindowUndockedEvent {
    type: 'window-undocked';
}

/**
 * @hidden
 */
export type SnapAndDockEvent = WindowDockedEvent|WindowUndockedEvent;

export function addEventListener(eventType: 'window-docked', listener: (event: WindowDockedEvent) => void): void;
export function addEventListener(eventType: 'window-undocked', listener: (event: WindowUndockedEvent) => void): void;
export function addEventListener<K extends SnapAndDockEvent>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.addListener(eventType, listener);
}

export function removeEventListener(eventType: 'window-docked', listener: (event: WindowDockedEvent) => void): void;
export function removeEventListener(eventType: 'window-undocked', listener: (event: WindowUndockedEvent) => void): void;
export function removeEventListener<K extends SnapAndDockEvent>(eventType: K['type'], listener: (event: K) => void): void {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.removeListener(eventType, listener);
}

/**
 * Undocks a window from any group it currently belongs to.
 *
 * Has no effect if the window is not currently docked.
 *
 * ```ts
 * import {snapAndDock} from 'openfin-layouts';
 *
 * // Undock the current window (all are equivalent)
 * snapAndDock.undockWindow();
 * snapAndDock.undockWindow(fin.desktop.Window.getCurrent());   // Using 'v1' API
 * snapAndDock.undockWindow(fin.Window.getCurrentSync());       // Using 'v2' API
 *
 * // Undock a different window
 * snapAndDock.undockWindow({uuid: 'my-app', name: 'other-window'});
 * ```
 *
 * @param identity The window to undock, defaults to the current window
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If the window specified by `identity` does not exist
 * @throws `Error`: If the window specified by `identity` has been de-registered
 */
export async function undockWindow(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(SnapAndDockAPI.UNDOCK_WINDOW, parseIdentity(identity));
}

/**
 * Will undock every window that is currently connected to a current window.
 *
 * This will completely disband the entire group, not just the windows directly touching `identity`.
 *
 * Has no effect if `identity` isn't currently snapped to any other window.
 *
 * ```ts
 * import {snapAndDock} from 'openfin-layouts';
 *
 * // Undock all windows attached to the current window (all are equivalent)
 * snapAndDock.undockGroup();
 * snapAndDock.undockGroup(fin.desktop.Window.getCurrent());   // Using 'v1' API
 * snapAndDock.undockGroup(fin.Window.getCurrentSync());       // Using 'v2' API
 *
 * // Undock all windows attached to a different window
 * snapAndDock.undockGroup({uuid: 'my-app', name: 'other-window'});
 * ```
 *
 * @param identity A window belonging to the group that should be disbanded, defaults to the current window/group
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If the window specified by `identity` does not exist
 * @throws `Error`: If the window specified by `identity` has been de-registered
 */
export async function undockGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(SnapAndDockAPI.UNDOCK_GROUP, parseIdentity(identity));
}

/**
 * Represents a group of docked entities (windows and/or tab groups)
 *
 * An array entry of type `WindowIdentity` represents a single window
 *
 * An array entry of type `WindowIdentity[]` represents a tab group. The elements of this sub-array are the identities of the tabs that form the tab group.
 */
export type DockGroup = (WindowIdentity | WindowIdentity[])[]

/**
 * Returns an array representing the entities docked with the provided window (see {@link DockGroup} for more details).
 *
 * If the window is not docked returns null.
 *
 * ```ts
 * import {snapAndDock} from 'openfin-layouts';
 *
 * // Gets all tabs for the current window context.
 * const myGroup: DockGroup | null = snapAndDock.getDockedWindows();
 *
 * // Get all tabs for another window context.
 * const otherWindow: Identity = {uuid: "sample-window-uuid", name: "sample-window-name"}
 * const otherWindowGroup: DockGroup | null = snapAndDock.getDockedWindows(otherWindow);
 * ```
 *
 * @param identity The window context, defaults to the current window.
 * @throws `Error`: If `identity` is not a valid {@link https://developer.openfin.co/docs/javascript/stable/global.html#Identity | Identity}.
 * @throws `Error`: If the window specified by `identity` does not exist
 * @throws `Error`: If the window specified by `identity` has been de-registered
 * @throws `Error`: If the provider is running an incompatible version
 *
 * @since 1.0.3
 */
export async function getDockedWindows(identity: Identity = getId()): Promise<DockGroup | null> {
    const response = await tryServiceDispatch<Identity, DockGroup | null>(SnapAndDockAPI.GET_DOCKED_WINDOWS, parseIdentity(identity));
    // @ts-ignore Compatability check. Provider will return false on unregistered actions.
    if (response === false) {
        console.warn('Warning: The currently running layouts service does not support the "getDockedWindows" method.');
        return null;
    }

    return response;
}
