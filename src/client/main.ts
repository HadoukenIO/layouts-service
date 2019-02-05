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
 * @param identity The window to deregister, defaults to the current window
 */
export async function deregister(identity: IdentityRule = getId() as IdentityRule): Promise<void> {
    return tryServiceDispatch<IdentityRule, void>(RegisterAPI.DEREGISTER, identity);
}

/**
 * Allows a window to opt-in back to this service if previously deregistered.
 *
 * This will enable *all* layouts-related functionality for the given window unless alternative behaviors are set in the layout configuration.
 *
 * @param identity The window to register, defaults to the current window
 */
export async function register(identity: IdentityRule): Promise<void> {
    throw new Error('Method not implemented');
}