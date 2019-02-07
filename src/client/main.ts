/**
 * @module Home
 */
import {tryServiceDispatch} from './connection';
import {getId, RegisterAPI} from './internal';
import * as snapAndDock from './snapanddock';
import * as tabbing from './tabbing';
import * as tabstrip from './tabstrip';
import {IdentityRule} from './types';
import * as workspaces from './workspaces';

export {snapAndDock, tabbing, tabstrip, workspaces};

/**
 * Allows a window to opt-out of this service.
 *
 * This will disable *all* layouts-related functionality for the given window.
 *
 * Multiple windows can be deregistered at once by using regex patterns on `identity.uuid`/`identity.name`.
 *
 * This API can be used to selectively programmatically override configuration set at an app-wide level, such as in the application manifest.
 *
 * ```ts
 * import {deregister} from 'openfin-layouts';
 *
 * // De-register the current window
 * deregister();
 *
 * // De-register a single named window
 * deregister({uuid: 'my-uuid', name: 'window'});
 *
 * // De-register multiple windows belonging to the same application
 * deregister({uuid: 'my-uuid', name: {expression: 'popup-.*'}});
 *
 * // De-register all windows belonging to an application, not matching a pattern
 * deregister({uuid: 'my-uuid', name: {expression: 'interactive-.*', invert: true}});
 * ```
 *
 * @param identity The window (or pattern of windows) to deregister, defaults to the current window
 */
export async function deregister(identity: IdentityRule = getId() as IdentityRule): Promise<void> {
    if (!identity.uuid || !identity.name) {
        throw new Error('Invalid window identity provided');
    }
    return tryServiceDispatch<IdentityRule, void>(RegisterAPI.DEREGISTER, identity);
}

/**
 * Allows a window to opt-in back to this service if previously deregistered.
 *
 * This will enable *all* layouts-related functionality for the given window unless alternative behaviors are set in the layout configuration.
 *
 * This API can be used to selectively programmatically override configuration set at an app-wide level, such as in the application manifest.
 *
 * ```ts
 * import {register} from 'openfin-layouts';
 *
 * // Register the current window
 * register();
 *
 * // Register a single named window
 * register({uuid: 'my-uuid', name: 'window'});
 *
 * // Register multiple windows belonging to the same application
 * register({uuid: 'my-uuid', name: {expression: 'interactive-.*'}});
 *
 * // Register all windows belonging to an application, not matching a pattern
 * register({uuid: 'my-uuid', name: {expression: 'popup-.*', invert: true}});
 * ```
 *
 * @param identity The window (or pattern of windows) to register, defaults to the current window
 */
export async function register(identity: IdentityRule = getId() as IdentityRule): Promise<void> {
    if (!identity.uuid || !identity.name) {
        throw new Error('Invalid window identity provided');
    }
    return tryServiceDispatch<IdentityRule, void>(RegisterAPI.REGISTER, identity);
}
