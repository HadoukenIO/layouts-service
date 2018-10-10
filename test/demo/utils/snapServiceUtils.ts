import {Identity} from 'hadouken-js-adapter';

import {Snappable} from '../../../src/provider/model/DesktopSnapGroup';
import {DesktopWindow} from '../../../src/provider/model/DesktopWindow';
import {WindowIdentity} from '../../provider/utils/explodeGroup';

import {executeJavascriptOnService} from './executeJavascriptOnService';

export async function isWindowRegistered(identity: Identity): Promise<boolean> {
    function remoteFunc(this: Window, identity: WindowIdentity): boolean {
        return !!this.model.getWindow(identity);
    }

    return executeJavascriptOnService<WindowIdentity, boolean>(remoteFunc, identity as WindowIdentity);
}

export async function getGroupedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: Window, identity: WindowIdentity): Identity[] {
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