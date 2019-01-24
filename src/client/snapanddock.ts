/**
 * @module Snap-and-Dock
 */
import {Identity} from 'hadouken-js-adapter';

import {tryServiceDispatch} from './connection';
import {getId, SnapAndDockAPI} from './internal';

/**
 * Undocks a window from any group it currently belongs to.
 *
 * Has no effect if the window is not currently docked.
 *
 * ```ts
 * import {undockWindow} from 'openfin-layouts';
 *
 * // Undock the current window (all are equivilant)
 * undockWindow();
 * undockWindow(fin.desktop.Window.getCurrent());   // Using 'v1' API
 * undockWindow(fin.Window.getCurrentSync());       // Using 'v2' API
 *
 * // Undock a different window
 * undockWindow({uuid: 'my-app', name: 'other-window'});
 * ```
 *
 * @param identity The window to undock, defaults to the current window
 * @throws `Error`: If `identity` is not a valid {@link WindowIdentity}
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
 * import {undockGroup} from 'openfin-layouts';
 *
 * // Undock all windows attached to the current window (all are equivilant)
 * undockGroup();
 * undockGroup(fin.desktop.Window.getCurrent());   // Using 'v1' API
 * undockGroup(fin.Window.getCurrentSync());       // Using 'v2' API
 *
 * // Undock all windows attached to a different window
 * undockGroup({uuid: 'my-app', name: 'other-window'});
 * ```
 *
 * @param identity A window belonging to the group that should be disbanded, defaults to the current window/group
 * @throws `Error`: If `identity` is not a valid {@link WindowIdentity}
 * @throws `Error`: If the window specified by `identity` does not exist
 * @throws `Error`: If the window specified by `identity` has been de-registered
 */
export async function undockGroup(identity: Identity = getId()): Promise<void> {
    return tryServiceDispatch<Identity, void>(SnapAndDockAPI.UNDOCK_GROUP, identity);
}
