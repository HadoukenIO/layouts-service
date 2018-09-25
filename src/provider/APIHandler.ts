import {Identity} from 'hadouken-js-adapter';
import {ProviderIdentity} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/channel';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {TabAPI} from '../client/APITypes';
import {ApplicationUIConfig, DropPosition, TabIdentifier, TabProperties} from '../client/types';

import {model, snapService, tabService} from './main';
import {DesktopTabGroup} from './model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity} from './model/DesktopWindow';
import {generateLayout} from './workspaces/create';
import {getAppToRestore, restoreApplication, restoreLayout} from './workspaces/restore';

/**
 * Manages all communication with the client. Stateless class that listens for incomming messages, and handles sending of messages to connected client(s).
 *
 * Client communication is separated from the rest of the provider code to allow easier versioning of client-provider interaction, if required in the future.
 */
export class APIHandler {
    private static readonly CHANNEL_NAME: string = 'of-layouts-service-v1';

    private providerChannel!: ChannelProvider;

    public get channel(): ChannelProvider {
        return this.providerChannel;
    }

    public isClientConnection(identity: Identity): boolean {
        return this.providerChannel.connections.some((conn: Identity) => {
            return identity.uuid === conn.uuid;
        });
    }

    public getClientConnection(identity: Identity): ProviderIdentity|null {
        const {uuid} = identity;
        const name = identity.name ? identity.name : uuid;

        return this.providerChannel.connections.find((conn: ProviderIdentity) => {
            return conn.uuid === uuid && conn.name === name;
        }) ||
            null;
    }

    /**
     * Sends a message to a single, connected client.
     *
     * Will fail silently if client with given identity doesn't exist and/or isn't connected to service.
     */
    public async sendToClient<T, R = void>(identity: Identity, action: string, payload: T): Promise<R|undefined> {
        const conn: ProviderIdentity|null = this.getClientConnection(identity);

        if (conn) {
            return this.providerChannel.dispatch(conn, action, payload);
        } else {
            return undefined;
        }
    }

    /**
     * Sends a message to all connected clients.
     */
    // tslint:disable-next-line:no-any
    public async sendToAll(action: string, payload: any): Promise<void> {
        await this.providerChannel.publish(action, payload);
    }

    public async register(): Promise<void> {
        const providerChannel: ChannelProvider = this.providerChannel = await fin.InterApplicationBus.Channel.create(APIHandler.CHANNEL_NAME);

        // Common
        providerChannel.onConnection(this.onConnection);
        providerChannel.register('deregister', this.deregister);

        // Snap & Dock
        providerChannel.register('undockWindow', this.undockWindow);
        providerChannel.register('undockGroup', this.undockGroup);

        // Workspaces
        providerChannel.register('generateLayout', generateLayout);
        providerChannel.register('restoreLayout', restoreLayout);
        providerChannel.register('appReady', this.appReady);

        // Tabbing
        providerChannel.register(TabAPI.CLOSETABGROUP, this.closeTabGroup);
        providerChannel.register(TabAPI.CREATETABGROUP, this.createTabGroup);
        providerChannel.register(TabAPI.STARTDRAG, this.startDrag);
        providerChannel.register(TabAPI.ENDDRAG, this.endDrag);
        providerChannel.register(TabAPI.GETTABS, this.getTabs);
        providerChannel.register(TabAPI.MAXIMIZETABGROUP, this.maximizeTabGroup);
        providerChannel.register(TabAPI.MINIMIZETABGROUP, this.minimizeTabGroup);
        providerChannel.register(TabAPI.REMOVETAB, this.removeTab);
        providerChannel.register(TabAPI.CLOSETAB, this.closeTab);
        providerChannel.register(TabAPI.REORDERTABS, this.reorderTabs);
        providerChannel.register(TabAPI.RESTORETABGROUP, this.restoreTabGroup);
        providerChannel.register(TabAPI.SETACTIVETAB, this.setActiveTab);
        providerChannel.register(TabAPI.SETTABCLIENT, this.setTabClient);
        providerChannel.register(TabAPI.UPDATETABPROPERTIES, this.updateTabProperties);
        providerChannel.register(TabAPI.ADDTAB, this.addTab);
    }

    // tslint:disable-next-line:no-any
    private onConnection(app: ProviderIdentity, payload?: any): void {
        if (payload && payload.version && payload.version.length > 0) {
            console.log(`connection from client: ${app.name}, version: ${payload.version}`);
        } else {
            console.log(`connection from client: ${app.name}, unable to determine version`);
        }
    }

    private async deregister(identity: WindowIdentity): Promise<void> {
        try {
            // Must first clean-up any usage of this window
            const tab: DesktopWindow|null = model.getWindow(identity);
            const group: DesktopTabGroup|null = tab && tab.getTabGroup();

            if (group) {
                await group.removeTab(tab!);
            }
        } catch (error) {
            console.error(error);
            throw new Error(`Unexpected error when deregistering: ${error}`);
        } finally {
            model.deregister(identity);
        }
    }

    private undockWindow(identity: WindowIdentity): void {
        snapService.undock(identity);
    }

    private undockGroup(identity: WindowIdentity): void {
        snapService.explodeGroup(identity);
    }

    private appReady(payload: void, identity: Identity): void {
        const {uuid} = identity;
        const appToRestore = getAppToRestore(uuid);

        if (appToRestore) {
            const {layoutApp, resolve} = appToRestore;
            restoreApplication(layoutApp, resolve);
        }
    }

    private setTabClient(payload: {config: ApplicationUIConfig, id: Identity}) {
        if (tabService.applicationConfigManager.exists(payload.id.uuid)) {
            console.error('Window already configured for tabbing');
            throw new Error('Window already configured for tabbing');
        }

        return tabService.applicationConfigManager.addApplicationUIConfig(payload.id.uuid, payload.config);
    }

    private getTabs(tabId: TabIdentifier): TabIdentifier[]|null {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            return null;
        }

        return group.tabs.map(tab => tab.getIdentity());
    }

    private async createTabGroup(tabs: TabIdentifier[]): Promise<void> {
        return tabService.createTabGroupWithTabs(tabs);
    }

    private async addTab(payload: {targetWindow: TabIdentifier, windowToAdd: TabIdentifier}): Promise<void> {
        const tabToAdd: DesktopWindow|null = model.getWindow(payload.windowToAdd);
        const targetTab: DesktopWindow|null = model.getWindow(payload.targetWindow);
        const targetGroup: DesktopTabGroup|null = targetTab && targetTab.getTabGroup();

        if (!targetGroup) {
            console.error('Target Window not in a group. Try createTabGroup instead.');
            throw new Error('Target Window not in a group. Try createTabGroup instead.');
        }
        if (!tabToAdd) {
            console.error('Could not find \'windowToAdd\'.');
            throw new Error('Could not find \'windowToAdd\'.');
        }

        if (tabService.applicationConfigManager.compareConfigBetweenApplications(payload.targetWindow.uuid, payload.windowToAdd.uuid)) {
            // return group.addTab(await new Tab({tabID: payload.windowToAdd}).init());
            return targetGroup.addTab(tabToAdd);
        } else {
            console.error('The tabs provided have incompatible tabstrip URLs');
            throw new Error('The tabs provided have incompatible tabstrip URLs');
        }
    }

    private removeTab(tab: TabIdentifier): Promise<void> {
        const ejectedTab: DesktopWindow|null = model.getWindow(tab);
        const tabGroup: DesktopTabGroup|null = ejectedTab && ejectedTab.getTabGroup();

        if (tabGroup) {
            return tabGroup.removeTab(ejectedTab!);
        } else if (!ejectedTab) {
            throw new Error(`No tab with ID ${tab ? `${tab.uuid}/${tab.name}` : tab}`);
        } else {
            throw new Error(`Tab with ID ${ejectedTab.getId()} doesn't belong to a tab group`);
        }
    }

    private setActiveTab(tabId: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.switchTab(tab!);
    }

    private async closeTab(tabId: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);

        if (tab) {
            return tab.close();
        } else {
            return Promise.reject(`No such tab: ${tabId}`);
        }

        // const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        // if (!group) {
        //     console.error('No tab group found for window');
        //     throw new Error('No tab group found for window');
        // }

        // return group.removeTab(tab!).then(() => tab!.close());
    }

    private async minimizeTabGroup(tabId: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.minimize();
    }

    private async maximizeTabGroup(tabId: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.maximize();
    }

    private async closeTabGroup(tabId: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        // Group will be destroyed automatically once all tabs have finished closing
        return group.removeAllTabs(true);
    }

    private async restoreTabGroup(tabId: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        if (await group.window.getState().state === 'minimized') {
            return group.window.applyProperties({state: 'normal'});
        } else {
            return group.restore();
        }
    }

    private reorderTabs(newOrdering: TabIdentifier[], tabId: ProviderIdentity): void {
        const tab: DesktopWindow|null = model.getWindow(tabId as WindowIdentity);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.reOrderTabArray(newOrdering);
    }

    private updateTabProperties(payload: {window: TabIdentifier, properties: Partial<TabProperties>}): void {
        const tab: DesktopWindow|null = model.getWindow(payload.window);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('No tab found for window');
            throw new Error('No tab found for window');
        }

        return group.updateTabProperties(tab!, payload.properties);
    }

    private startDrag(payload: {}, id: ProviderIdentity): void {
        // TODO assign uuid, name from provider
        tabService.dragWindowManager.showWindow(id as WindowIdentity);
    }

    private async endDrag(payload: {event: DropPosition, window: TabIdentifier}): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(payload.window);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (!group) {
            console.error('Window is not registered for tabbing');
            throw new Error('Window is not registered for tabbing');
        }

        tabService.dragWindowManager.hideWindow();
        tabService.ejectTab(payload.window, {x: payload.event.screenX, y: payload.event.screenY});
    }
}
