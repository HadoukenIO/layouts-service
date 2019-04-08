import {Identity} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../../src/provider/model/DesktopWindow';
import {Point} from '../../../src/provider/snapanddock/utils/PointUtils';

import {executeJavascriptOnService} from './serviceUtils';


export async function refreshWindowState(identity: Identity): Promise<void> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): Promise<void> {
        const desktopWindow = this.model.getWindow(identity);
        if (desktopWindow) {
            return desktopWindow.refresh();
        } else {
            throw new Error(`Attempted to refresh state of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }

    return executeJavascriptOnService<WindowIdentity, void>(remoteFunc, identity as WindowIdentity);
}

export async function getTopmostWindow(position: Point<number>): Promise<Identity|null> {
    function remoteFunc(this: ProviderWindow, position: Point<number>): Identity|null {
        const windowAt = this.model.getWindowAt(position.x, position.y);

        return windowAt && windowAt.identity;
    }

    return executeJavascriptOnService<Point<number>, Identity|null>(remoteFunc, position);
}
