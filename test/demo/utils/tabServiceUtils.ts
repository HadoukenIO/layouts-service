import {Identity} from 'hadouken-js-adapter';

import {TabAPI} from '../../../src/client/APITypes';
import {TabProperties, UpdateTabPropertiesPayload} from '../../../src/client/types';
import {DesktopTabGroup} from '../../../src/provider/model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity} from '../../../src/provider/model/DesktopWindow';

import {executeJavascriptOnService, sendServiceMessage} from './serviceUtils';

export async function getTabGroupID(identity: Identity): Promise<string|null> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): string|null {
        const tab: DesktopWindow|null = this.model.getWindow(identity);
        const tabGroup: DesktopTabGroup|null = tab ? tab.getTabGroup() : null;
        return tabGroup && tabGroup.ID ? tabGroup.ID : null;
    }
    return executeJavascriptOnService<WindowIdentity, string|null>(remoteFunc, identity as WindowIdentity);
}

/**
 * Queries the service for all windows in the same tabGroup as the given identity. If the window
 * is not in a tab group, only that window is returned.
 * @param identity
 */
export async function getTabbedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): Identity[] {
        const tab: DesktopWindow|null = this.model.getWindow(identity);
        const tabGroup: DesktopTabGroup|null = tab ? tab.getTabGroup() : null;
        if (tabGroup && tabGroup.tabs) {
            return tabGroup.tabs.map((tab: DesktopWindow) => tab.getIdentity());
        } else {
            return [identity];
        }
    }
    return executeJavascriptOnService<WindowIdentity, Identity[]>(remoteFunc, identity as WindowIdentity);
}


/**
 * Send a message to the service requesting a provided tabs properties be updated, aka updateTabProperties API call.
 */
export async function updateTabProperties(identity: Identity, properties: Partial<TabProperties>) {
    await sendServiceMessage<UpdateTabPropertiesPayload, void>(TabAPI.UPDATETABPROPERTIES, {window: identity, properties});
}