import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {TabAPI, UpdateTabPropertiesPayload} from '../../../src/client/internal';
import {TabProperties, WindowIdentity} from '../../../src/client/types';
import {DesktopTabGroup} from '../../../src/provider/model/DesktopTabGroup';
import {DesktopWindow} from '../../../src/provider/model/DesktopWindow';
import {getConnection} from '../../provider/utils/connect';

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
 * Takes a window identity (typically an application window, but tabstrip will work too) and returns the Window object
 * of the tabstrip. This method assumes that 'identity' is tabbed. An exception will be thrown if that is not the case.
 *
 * @param identity Identity of any valid window
 */
export async function getTabstrip(identity: Identity): Promise<_Window> {
    const tabGroupId: string|null = await getTabGroupID(identity);

    if (tabGroupId) {
        const fin = await getConnection();
        return fin.Window.wrapSync({uuid: 'layouts-service', name: tabGroupId});
    } else {
        throw new Error(`Window ${identity.uuid}/${identity.name} either doesn't exist or isn't tabbed`);
    }
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


export async function getActiveTab(identity: Identity): Promise<Identity> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): Identity {
        const desktopWindow = this.model.getWindow(identity);

        if (desktopWindow) {
            const tabGroup = desktopWindow.getTabGroup();

            if (tabGroup) {
                return tabGroup.activeTab.getIdentity();

            } else {
                throw new Error(`Error when getting active tab: window ${desktopWindow.getId()} is not in a tab group`);
            }

        } else {
            throw new Error(`Attempted to get the tabGroup of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }

    return executeJavascriptOnService<WindowIdentity, Identity>(remoteFunc, identity as WindowIdentity);
}

/**
 * Send a message to the service requesting a provided tabs properties be updated, aka updateTabProperties API call.
 */
export async function updateTabProperties(identity: Identity, properties: Partial<TabProperties>) {
    await sendServiceMessage<UpdateTabPropertiesPayload, void>(TabAPI.UPDATETABPROPERTIES, {window: identity, properties});
}