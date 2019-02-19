/**
 * @module SnapAndDock
 */
import {Identity} from 'hadouken-js-adapter';

import {eventEmitter, tryServiceDispatch} from './connection';
import {getId, SnapAndDockAPI} from './internal';


/**
 * Details of the {@link addEventListener|'window-docked'} event.
 *
 * Event fired when one window is docked to another.
 *
 * It is not possible to receive events for another window. When adding a listener, the listener will only ever fire for the "`fin.desktop.Window.getCurrent()`"
 * window.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
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
 * The service considers any windows that are tabbed together to also be in the same snap group, so this event will also fire when a window is added to a tab
 * group. This may change in future versions of the service.
 *
 * @event
 */
export interface WindowDockedEvent {
    type: 'window-docked';
}

/**
 * Details of the {@link addEventListener|'window-undocked'} event.
 *
 * Event fired when one window is undocked from it's neighbor(s).
 *
 * It is not possible to receive events for another window. When adding a listener, the listener will only ever fire for the "`fin.desktop.Window.getCurrent()`"
 * window.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
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
 * The service considers any windows that are tabbed together to also be in the same snap group, so this event will also fire when a window is removed from a
 * tab group. This may change in future versions of the service.
 *
 * @event
 */
export interface WindowUndockedEvent {
    type: 'window-undocked';
}

/**
 * @hidden
 */
export type EventMap = WindowDockedEvent|WindowUndockedEvent;


/**
 * @type window-docked
 */
export async function addEventListener(eventType: 'window-docked', listener: (event: WindowDockedEvent) => void): Promise<void>;

/**
 * @type window-undocked
 */
export async function addEventListener(eventType: 'window-undocked', listener: (event: WindowUndockedEvent) => void): Promise<void>;

export async function addEventListener<K extends EventMap>(eventType: K['type'], listener: (event: K) => void): Promise<void> {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }

    eventEmitter.addListener(eventType, listener);
}

/**
 * Undocks a window from any group it currently belongs to.
 *
 * Has no effect if the window is not currently docked.
 *
 * ```ts
 * import {snapAndDock} from 'openfin-layouts';
 *
 * // Undock the current window (all are equivilant)
 * snapAndDock.undockWindow();
 * snapAndDock.undockWindow(fin.desktop.Window.getCurrent());   // Using 'v1' API
 * snapAndDock.undockWindow(fin.Window.getCurrentSync());       // Using 'v2' API
 *
 * // Undock a different window
 * snapAndDock.undockWindow({uuid: 'my-app', name: 'other-window'});
 * ```
 *
 * @param identity The window to undock, defaults to the current window
 * @throws `Error`: If `identity` is not a valid {@link Identity}
 * @throws `Error`: If the window specified by `identity` does not exist
 * @throws `Error`: If the window specified by `identity` has been de-registered
 */
export async function undockWindow(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(SnapAndDockAPI.UNDOCK_WINDOW, identity);
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
 * // Undock all windows attached to the current window (all are equivilant)
 * snapAndDock.undockGroup();
 * snapAndDock.undockGroup(fin.desktop.Window.getCurrent());   // Using 'v1' API
 * snapAndDock.undockGroup(fin.Window.getCurrentSync());       // Using 'v2' API
 *
 * // Undock all windows attached to a different window
 * snapAndDock.undockGroup({uuid: 'my-app', name: 'other-window'});
 * ```
 *
 * @param identity A window belonging to the group that should be disbanded, defaults to the current window/group
 * @throws `Error`: If `identity` is not a valid {@link Identity}
 * @throws `Error`: If the window specified by `identity` does not exist
 * @throws `Error`: If the window specified by `identity` has been de-registered
 */
export async function undockGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(SnapAndDockAPI.UNDOCK_GROUP, identity);
}
