import {Identity} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {TabAPI, UpdateTabPropertiesPayload} from '../../../src/client/internal';
import {TabProperties, WindowIdentity, WindowState} from '../../../src/client/types';
import {DesktopTabGroup} from '../../../src/provider/model/DesktopTabGroup';
import {DesktopWindow} from '../../../src/provider/model/DesktopWindow';
import {getConnection} from '../../provider/utils/connect';

import {executeJavascriptOnService, sendServiceMessage} from './serviceUtils';

/**
 * Converts an identity into a string ID. Mirrors {@link DesktopModel.getId}.
 *
 * @param identity Any entity identity
 */
export function getId(identity: Identity): string {
    if (identity) {
        return `${identity.uuid}/${identity.name}`;
    } else {
        throw new Error('Invalid identity');
    }
}

/**
 * If the window represented by 'identity' is tabbed, returns the identity of that tabgroup's tabstrip.
 *
 * Otherwise, returns null.
 *
 * @param identity Any valid window identity
 */
export async function getTabGroupIdentity(identity: Identity): Promise<WindowIdentity|null> {
    function remoteFunc(this: ProviderWindow, identity: WindowIdentity): WindowIdentity|null {
        const tab: DesktopWindow|null = this.model.getWindow(identity);
        const tabGroup: DesktopTabGroup|null = tab ? tab.tabGroup : null;
        return tabGroup ? tabGroup.identity : null;
    }
    return executeJavascriptOnService<WindowIdentity, WindowIdentity|null>(remoteFunc, identity as WindowIdentity);
}

/**
 * As 'getTabGroupIdentity', but converts the returned identity into an ID.
 *
 * @param identity Any valid window identity
 */
export async function getTabGroupID(identity: Identity): Promise<string|null> {
    const tabstripIdentity: WindowIdentity|null = await getTabGroupIdentity(identity);

    if (tabstripIdentity) {
        return getId(tabstripIdentity);
    } else {
        return null;
    }
}

export async function removeTab(identity: Identity): Promise<void> {
    await sendServiceMessage<WindowIdentity, void>(TabAPI.REMOVETAB, identity as WindowIdentity);
}

/**
 * Takes a window identity (typically an application window, but tabstrip will work too) and returns the Window object
 * of the tabstrip. This method assumes that 'identity' is tabbed. An exception will be thrown if that is not the case.
 *
 * @param identity Identity of any valid window
 */
export async function getTabstrip(identity: Identity): Promise<_Window> {
    const tabGroupIdentity: WindowIdentity|null = await getTabGroupIdentity(identity);

    if (tabGroupIdentity) {
        const fin = await getConnection();
        return fin.Window.wrapSync(tabGroupIdentity);
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
        const tabGroup: DesktopTabGroup|null = tab ? tab.tabGroup : null;
        if (tabGroup && tabGroup.tabs) {
            return tabGroup.tabs.map((tab: DesktopWindow) => tab.identity);
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
            const tabGroup = desktopWindow.tabGroup;

            if (tabGroup) {
                return tabGroup.activeTab.identity;

            } else {
                throw new Error(`Error when getting active tab: window ${desktopWindow.id} is not in a tab group`);
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

export async function getTabGroupState(identity: Identity): Promise<WindowState> {
    return executeJavascriptOnService<WindowIdentity, WindowState>(function(this: ProviderWindow, identity: WindowIdentity): WindowState {
        const desktopWindow = this.model.getWindow(identity);

        if (desktopWindow) {
            const tabGroup = desktopWindow.tabGroup;

            if (tabGroup) {
                return tabGroup.state;

            } else {
                throw new Error(`Error when determining tabGroup state: window ${desktopWindow.id} is not in a tab group`);
            }

        } else {
            throw new Error(`Attempted to get the tabGroup of non-existent or deregistered window: ${identity.uuid}/${identity.name}`);
        }
    }, identity as WindowIdentity);
}