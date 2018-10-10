import {Identity} from 'hadouken-js-adapter';

import {Snappable} from '../../../src/provider/model/DesktopSnapGroup';
import {DesktopWindow, WindowIdentity} from '../../../src/provider/model/DesktopWindow';

import {executeJavascriptOnService, sendServiceMessage} from './serviceUtils';

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

export async function undockWindow(identity: WindowIdentity) {
    await sendServiceMessage<WindowIdentity, void>('undockWindow', identity);
}

export async function explodeGroup(identity: WindowIdentity) {
    await sendServiceMessage<WindowIdentity, void>('undockGroup', identity);
}
