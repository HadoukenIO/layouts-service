import {Identity} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../../src/client/types';
import {Snappable} from '../../../src/provider/model/DesktopSnapGroup';
import {DesktopWindow} from '../../../src/provider/model/DesktopWindow';

import {executeJavascriptOnService, sendServiceMessage} from './serviceUtils';

/**
 * Check if a given window is registered with the layouts-service.
 */
export async function isWindowRegistered(identity: Identity): Promise<boolean> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): boolean {
        return !!this.model.getWindow(identity);
    }

    return executeJavascriptOnService<WindowIdentity, boolean>(remoteFunc, identity as WindowIdentity);
}

/**
 * Returns an array of the identities of all windows in the same SnapGroup as the given window
 * (including the given window).
 *
 * If the window is not grouped, a single-item array of its own identity is returned.
 */
export async function getGroupedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): Identity[] {
        const snapWindow: DesktopWindow|null = this.model.getWindow(identity);
        if (snapWindow) {
            return snapWindow.getSnapGroup().windows.map((win: Snappable) => {
                return win.getIdentity();
            });
        } else {
            throw new Error(`Attempted to get window group of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }
    return executeJavascriptOnService<WindowIdentity, Identity[]>(remoteFunc, identity as WindowIdentity);
}

/**
 * Returns the id of given window's snapGroup.
 */
export async function getSnapGroupID(identity: Identity) {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity) {
        const snapWindow: DesktopWindow|null = this.model.getWindow(identity);
        if (snapWindow) {
            return snapWindow.getSnapGroup().id;
        } else {
            throw new Error(`Attempted to get snapGroup id of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }
    return executeJavascriptOnService(remoteFunc, identity as WindowIdentity);
}

/**
 * Send a message to the service requesting that the window be undocked.
 */
export async function undockWindow(identity: Identity) {
    await sendServiceMessage<WindowIdentity, void>('undockWindow', identity as WindowIdentity);
}

/**
 * Send a message to the service requesting that the group be exploded.
 */
export async function explodeGroup(identity: Identity) {
    await sendServiceMessage<WindowIdentity, void>('undockGroup', identity as WindowIdentity);
}
