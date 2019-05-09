import {WindowIdentity} from '../model/DesktopWindow';

export function wrapWindow(identity: WindowIdentity) {
    if (identity.isExternalWindow) {
        return fin.ExternalWindow.wrapSync(identity);
    } else {
        return fin.Window.wrapSync(identity);
    }
}
