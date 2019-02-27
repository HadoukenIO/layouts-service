/**
 * @module Index
 */
import {tryServiceDispatch} from './connection';
import {getId, RegisterAPI, parseIdentityRule} from './internal';
import * as snapAndDock from './snapanddock';
import * as tabbing from './tabbing';
import * as tabstrip from './tabstrip';
import * as workspaces from './workspaces';

export {snapAndDock, tabbing, tabstrip, workspaces};

/**
 * Interface used to identify window instances. Unlike `hadouken-js-adapter` types, the layouts service expects the
 * `name` field to be present on every identity object.
 *
 * For convenience, client functions are typed to take the `Identity` type rather than `WindowIdentity` in order to
 * prevent excessive casting.  The client will fill in the name field with the uuid value if not set.  Any window identities returned by the service will always
 * be of type `WindowIdentity`.
 */
export interface WindowIdentity {
    /**
     * Application identifier
     */
    uuid: string;

    /**
     * Window identifier
     */
    name: string;
}

/**
 * As `Identity`, but allows for multiple window identities to be specified, through the use of regular expressions.
 *
 * If using a regex, it must be specified in JSON-like format, using the {@link RegEx} type - JS regex literals are not supported.
 */
export interface IdentityRule {
    uuid: string|RegEx;
    name: string|RegEx;
}

/**
 * Format that must be used when passing regular expressions to the service.
 *
 * Note: Only a fairly small subset of API calls allow the use of regex patterns, most API calls require a single explicit window identity.
 */
export interface RegEx {
    /**
     * Defines the regex pattern.
     *
     * Do not wrap the expression in `/` characters - specify the pattern string as you would when passing to the RegExp constructor.
     */
    expression: string;

    /**
     * Any additional flags that form part of this expression. Supported same [values
     * ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters)as the native JS `RegExp` class.
     */
    flags?: string;

    /**
     * In addition, an `invert` parameter can also be used, to flip the filter that is defined by this expression.
     */
    invert?: boolean;
}

/**
 * Window state, corresponds to `WindowOptions.state`
 */
export type WindowState = 'normal'|'minimized'|'maximized';

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
    return tryServiceDispatch<IdentityRule, void>(RegisterAPI.DEREGISTER, parseIdentityRule(identity));
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
    return tryServiceDispatch<IdentityRule, void>(RegisterAPI.REGISTER, parseIdentityRule(identity));
}
