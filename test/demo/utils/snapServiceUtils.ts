import {Identity} from 'hadouken-js-adapter';
import {executeJavascriptOnService} from './executeJavascriptOnService';
import { SnapWindow } from '../../providerTypes';

export async function isWindowRegistered(identity: Identity): Promise<boolean> {
    function remoteFunc(this: Window, identity:Identity): boolean {
        return !!this.snapService.getSnapWindow(identity);
    }

    return executeJavascriptOnService<Identity, boolean>(remoteFunc, identity);
}

export async function getGroupedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: Window, identity: Identity): Identity[] {
        const snapWindow: SnapWindow | undefined = this.snapService.getSnapWindow(identity);
        if (snapWindow) {
            return snapWindow.getGroup().windows.map((win: SnapWindow) => {
                return win.getIdentity();
            });
        } else {
            throw new Error(`Attempted to get window group of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }

    return executeJavascriptOnService<Identity,Identity[]>(remoteFunc, identity);
}