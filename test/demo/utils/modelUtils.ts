import { Identity } from "hadouken-js-adapter";
import { WindowIdentity } from "../../../src/provider/model/DesktopWindow";
import { executeJavascriptOnService } from "./serviceUtils";


export function refreshWindowState(identity: Identity) {
    function remoteFunc(this:ProviderWindow, identity: WindowIdentity):Promise<void> {
        const desktopWindow = this.model.getWindow(identity);
        if (desktopWindow) {
            return desktopWindow.refresh();
        } else {
            throw new Error(`Attempted to refresh state of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }

    executeJavascriptOnService(remoteFunc, identity as WindowIdentity);
}