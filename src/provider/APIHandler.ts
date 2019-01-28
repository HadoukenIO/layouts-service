import {Identity} from 'hadouken-js-adapter';
import {ProviderIdentity} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/channel';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {DropPosition, RegisterAPI, SERVICE_CHANNEL, SnapAndDockAPI, TabAPI, WorkspaceAPI, LegacyAPI} from '../client/internal';
import {EventMap} from '../client/main';
import {ApplicationUIConfig, TabProperties} from '../client/types';

import {model, snapService, tabService} from './main';
import {DesktopTabGroup} from './model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity} from './model/DesktopWindow';
import {deregisterWindow, generateLayout} from './workspaces/create';
import {getAppToRestore, restoreApplication, restoreLayout} from './workspaces/restore';

export type WindowMessages = keyof EventMap|WorkspaceAPI.RESTORE_HANDLER|WorkspaceAPI.SAVE_HANDLER|LegacyAPI.SAVE_HANDLER|LegacyAPI.RESTORE_HANDLER;

/**
 * Manages all communication with the client. Stateless class that listens for incomming messages, and handles sending of messages to connected client(s).
 *
 * Client communication is separated from the rest of the provider code to allow easier versioning of client-provider interaction, if required in the future.
 */
export class APIHandler {
    private providerChannel!: ChannelProvider;

    public get channel(): ChannelProvider {
        return this.providerChannel;
    }

    public isClientConnection(identity: Identity): boolean {
        return this.providerChannel.connections.some((conn: Identity) => {
            return identity.uuid === conn.uuid && identity.name === conn.name;
        });
    }

    /**
     * Sends a message to a single, connected client.
     *
     * Will fail silently if client with given identity doesn't exist and/or isn't connected to service.
     */
    public async sendToClient<P, R = void>(identity: Identity, action: WindowMessages, payload: P): Promise<R|undefined> {
        return this.providerChannel.dispatch(identity, action, payload);
    }

    /**
     * Sends a message to all connected clients.
     */
    public async sendToAll<P>(action: WindowMessages, payload: P): Promise<void> {
        await this.providerChannel.publish(action, payload);
    }

    public async register(): Promise<void> {
        const providerChannel: ChannelProvider = this.providerChannel = await fin.InterApplicationBus.Channel.create(SERVICE_CHANNEL);

        // Common
        providerChannel.onConnection(this.onConnection);
        providerChannel.register(RegisterAPI.DEREGISTER, this.deregister);

        // Snap & Dock
        providerChannel.register(SnapAndDockAPI.UNDOCK_WINDOW, this.undockWindow);
        providerChannel.register(SnapAndDockAPI.UNDOCK_GROUP, this.undockGroup);

        // Workspaces
        providerChannel.register(WorkspaceAPI.GENERATE_LAYOUT, generateLayout);
        providerChannel.register(WorkspaceAPI.RESTORE_LAYOUT, restoreLayout);
        providerChannel.register(WorkspaceAPI.APPLICATION_READY, this.appReady);

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
        providerChannel.register(TabAPI.SETTABSTRIP, this.setTabstrip);
        providerChannel.register(TabAPI.UPDATETABPROPERTIES, this.updateTabProperties);
        providerChannel.register(TabAPI.ADDTAB, this.addTab);


        // Legacy API (Used before 1.0 cleanup)
        providerChannel.register(LegacyAPI.APPLICATION_READY, this.appReady);
        providerChannel.register(LegacyAPI.DEREGISTER, this.deregister);
        providerChannel.register(LegacyAPI.GENERATE_LAYOUT, generateLayout);
        providerChannel.register(LegacyAPI.RESTORE_LAYOUT, restoreLayout);
        providerChannel.register(LegacyAPI.UNDOCK_GROUP, this.undockGroup);
        providerChannel.register(LegacyAPI.UNDOCK_WINDOW, this.undockWindow);
    }

    // tslint:disable-next-line:no-any
    private onConnection(app: Identity, payload?: any): void {
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
            const group: DesktopTabGroup|null = tab && tab.tabGroup;

            if (group) {
                await group.removeTab(tab!);
            }
        } catch (error) {
            console.error(error);
            throw new Error(`Unexpected error when deregistering: ${error}`);
        } finally {
            model.deregister(identity);
            deregisterWindow(identity);
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

    private setTabstrip(payload: {config: ApplicationUIConfig, id: Identity}) {
        if (tabService.applicationConfigManager.exists(payload.id.uuid)) {
            console.error('Window already configured for tabbing');
            throw new Error('Window already configured for tabbing');
        }

        return tabService.applicationConfigManager.addApplicationUIConfig(payload.id.uuid, payload.config);
    }

    private getTabs(tabId: WindowIdentity): WindowIdentity[]|null {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            return null;
        }

        return group.tabs.map(tab => tab.identity);
    }

    private async createTabGroup(tabs: WindowIdentity[]): Promise<void> {
        return tabService.createTabGroupWithTabs(tabs);
    }

    private async addTab(payload: {targetWindow: WindowIdentity, windowToAdd: WindowIdentity}): Promise<void> {
        const tabToAdd: DesktopWindow|null = model.getWindow(payload.windowToAdd);
        const targetTab: DesktopWindow|null = model.getWindow(payload.targetWindow);
        const targetGroup: DesktopTabGroup|null = targetTab && targetTab.tabGroup;

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

    private removeTab(tab: WindowIdentity): Promise<void> {
        const ejectedTab: DesktopWindow|null = model.getWindow(tab);
        const tabGroup: DesktopTabGroup|null = ejectedTab && ejectedTab.tabGroup;

        if (tabGroup) {
            return tabGroup.removeTab(ejectedTab!);
        } else if (!ejectedTab) {
            throw new Error(`No tab with ID ${tab ? `${tab.uuid}/${tab.name}` : tab}`);
        } else {
            throw new Error(`Tab with ID ${ejectedTab.id} doesn't belong to a tab group`);
        }
    }

    private setActiveTab(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.switchTab(tab!);
    }

    private async closeTab(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);

        if (tab) {
            return tab.close();
        } else {
            return Promise.reject(`No such tab: ${tabId}`);
        }
    }

    private async minimizeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.minimize();
    }

    private async maximizeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.maximize();
    }

    private async closeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        // Group will be destroyed automatically once all tabs have finished closing
        return group.removeAllTabs(true);
    }

    private async restoreTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        if (await group.window.currentState.state === 'minimized') {
            return group.window.applyProperties({state: 'normal'});
        } else {
            return group.restore();
        }
    }

    private reorderTabs(newOrdering: WindowIdentity[], tabId: ProviderIdentity): void {
        const tab: DesktopWindow|null = model.getWindow(tabId as WindowIdentity);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.reOrderTabArray(newOrdering);
    }

    private updateTabProperties(payload: {window: WindowIdentity, properties: Partial<TabProperties>}): void {
        const tab: DesktopWindow|null = model.getWindow(payload.window);

        if (!(tab && tab.tabGroup)) {
            console.error('No tab found for window');
            throw new Error('No tab found for window');
        } else {
            return tabService.updateTabProperties(tab, payload.properties);
        }
    }

    private startDrag(payload: {}, id: ProviderIdentity): void {
        // TODO assign uuid, name from provider
        tabService.dragWindowManager.showWindow(id as WindowIdentity);
    }

    private async endDrag(payload: {event: DropPosition, window: WindowIdentity}): Promise<void> {
        const tab: DesktopWindow|null = model.getWindow(payload.window);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group || !tab) {
            console.error('Window is not registered for tabbing');
            throw new Error('Window is not registered for tabbing');
        }

        const target = tabService.getTarget(tab);
        tabService.dragWindowManager.hideWindow();

        if (target) {
            await tabService.applyTabTarget(target);
        }
    }
}
