import {Identity} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../provider/utils/explodeGroup';

import {executeJavascriptOnService} from './executeJavascriptOnService';

export async function isWindowRegistered(identity: Identity): Promise<boolean> {
    function remoteFunc(this: Window, identity: Identity): boolean {
        //@ts-ignore Need to call private method. Will be changed following refactor.
        return !!this.snapService.getSnapWindow(identity as WindowIdentity);
    }

    return executeJavascriptOnService<Identity, boolean>(remoteFunc, identity);
}

export async function getGroupedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: Window, identity: Identity): Identity[] {
        //@ts-ignore Need to call private method. Will be changed following refactor.
        const snapWindow = this.snapService.getSnapWindow(identity as WindowIdentity);
        if (snapWindow) {
            return snapWindow.getGroup().windows.map(win => {
                return win.getIdentity();
            });
        } else {
            throw new Error(`Attempted to get window group of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }

    return executeJavascriptOnService<Identity, Identity[]>(remoteFunc, identity);
}