import {Identity} from 'hadouken-js-adapter';
import {Action, ProviderIdentity} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/channel';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {RegisterAPI, SERVICE_CHANNEL, SnapAndDockAPI, TabAPI, WorkspaceAPI} from '../client/internal';
import {ApplicationUIConfig, TabProperties} from '../client/types';

import {LegacyAPI, WindowMessages} from './APIMessages';
import {ConfigStore} from './main';
import {DesktopModel} from './model/DesktopModel';
import {DesktopTabGroup} from './model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity} from './model/DesktopWindow';
import {SnapService} from './snapanddock/SnapService';
import {TabService} from './tabbing/TabService';
import {generateWorkspace} from './workspaces/create';
import {appReadyForRestore, restoreWorkspace} from './workspaces/restore';


/**
 * Manages all communication with the client. Stateless class that listens for incoming messages, and handles sending of messages to connected client(s).
 *
 * Client communication is separated from the rest of the provider code to allow easier versioning of client-provider interaction, if required in the future.
 */
export class APIHandler {
    private _providerChannel!: ChannelProvider;

    private _model: DesktopModel;
    private _config: ConfigStore;
    private _snapService: SnapService;
    private _tabService: TabService;

    constructor(model: DesktopModel, config: ConfigStore, snapService: SnapService, tabService: TabService) {
        this._model = model;
        this._config = config;
        this._snapService = snapService;
        this._tabService = tabService;
    }

    public get channel(): ChannelProvider {
        return this._providerChannel;
    }

    public isClientConnection(identity: Identity): boolean {
        return this._providerChannel.connections.some((conn: Identity) => {
            return identity.uuid === conn.uuid && identity.name === conn.name;
        });
    }

    /**
     * Sends a message to a single, connected client.
     *
     * Will fail silently if client with given identity doesn't exist and/or isn't connected to service.
     */
    public async sendToClient<P, R = void>(identity: Identity, action: WindowMessages, payload: P): Promise<R|undefined> {
        return this._providerChannel.dispatch(identity, action, payload);
    }

    /**
     * Sends a message to all connected clients.
     */
    public async sendToAll<P>(action: WindowMessages, payload: P): Promise<void> {
        await this._providerChannel.publish(action, payload);
    }

    public async registerListeners(): Promise<void> {
        const providerChannel: ChannelProvider = this._providerChannel = await fin.InterApplicationBus.Channel.create(SERVICE_CHANNEL);

        // Common
        providerChannel.onConnection(this.onConnection);
        this.registerListener(RegisterAPI.REGISTER, this.register);
        this.registerListener(RegisterAPI.DEREGISTER, this.deregister);

        // Snap & Dock
        this.registerListener(SnapAndDockAPI.UNDOCK_WINDOW, this.undockWindow);
        this.registerListener(SnapAndDockAPI.UNDOCK_GROUP, this.undockGroup);

        // Workspaces
        this.registerListener(WorkspaceAPI.GENERATE_LAYOUT, generateWorkspace);
        this.registerListener(WorkspaceAPI.RESTORE_LAYOUT, restoreWorkspace);
        this.registerListener(WorkspaceAPI.APPLICATION_READY, this.appReady);

        // Tabbing
        this.registerListener(TabAPI.CLOSETABGROUP, this.closeTabGroup);
        this.registerListener(TabAPI.CREATETABGROUP, this.createTabGroup);
        this.registerListener(TabAPI.STARTDRAG, this.startDrag);
        this.registerListener(TabAPI.ENDDRAG, this.endDrag);
        this.registerListener(TabAPI.GETTABS, this.getTabs);
        this.registerListener(TabAPI.MAXIMIZETABGROUP, this.maximizeTabGroup);
        this.registerListener(TabAPI.MINIMIZETABGROUP, this.minimizeTabGroup);
        this.registerListener(TabAPI.REMOVETAB, this.removeTab);
        this.registerListener(TabAPI.CLOSETAB, this.closeTab);
        this.registerListener(TabAPI.REORDERTABS, this.reorderTabs);
        this.registerListener(TabAPI.RESTORETABGROUP, this.restoreTabGroup);
        this.registerListener(TabAPI.SETACTIVETAB, this.setActiveTab);
        this.registerListener(TabAPI.SETTABSTRIP, this.setTabstrip);
        this.registerListener(TabAPI.UPDATETABPROPERTIES, this.updateTabProperties);
        this.registerListener(TabAPI.ADDTAB, this.addTab);


        // Legacy API (Used before 1.0 cleanup)
        this.registerListener(LegacyAPI.APPLICATION_READY, this.appReady);
        this.registerListener(LegacyAPI.DEREGISTER, this.deregister);
        this.registerListener(LegacyAPI.GENERATE_LAYOUT, generateWorkspace);
        this.registerListener(LegacyAPI.RESTORE_LAYOUT, restoreWorkspace);
        this.registerListener(LegacyAPI.UNDOCK_GROUP, this.undockGroup);
        this.registerListener(LegacyAPI.UNDOCK_WINDOW, this.undockWindow);
    }

    private registerListener(topic: string, handler: Action) {
        // Bind callback
        handler = handler.bind(this) as Action;

        // Add to underlying channel object
        this._providerChannel.register(topic, handler);
    }

    // tslint:disable-next-line:no-any
    private onConnection(app: Identity, payload?: any): void {
        if (payload && payload.version && payload.version.length > 0) {
            console.log(`connection from client: ${app.name}, version: ${payload.version}`);
        } else {
            console.log(`connection from client: ${app.name}, unable to determine version`);
        }
    }

    private async register(identity: WindowIdentity, id: ProviderIdentity): Promise<void> {
        try {
            this._model.register(identity, {level: 'window', uuid: id.uuid, name: id.name || id.uuid});
        } catch (error) {
            console.error(error);
            throw new Error(`Unexpected error when registering: ${error}`);
        }
    }

    private async deregister(identity: WindowIdentity, id: ProviderIdentity): Promise<void> {
        try {
            this._model.deregister(identity, {level: 'window', uuid: id.uuid, name: id.name || id.uuid});
        } catch (error) {
            console.error(error);
            throw new Error(`Unexpected error when deregistering: ${error}`);
        }
    }

    private undockWindow(identity: WindowIdentity): void {
        this._snapService.undock(identity);
    }

    private undockGroup(identity: WindowIdentity): void {
        this._snapService.explodeGroup(identity);
    }

    private appReady(payload: void, identity: Identity): void {
        appReadyForRestore(identity.uuid);
    }

    private setTabstrip(payload: {config: ApplicationUIConfig, id: Identity}) {
        this._config.add({level: 'application', uuid: payload.id.uuid}, {tabstrip: payload.config});
    }

    private getTabs(tabId: WindowIdentity): WindowIdentity[]|null {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            return null;
        }

        return group.tabs.map(tab => tab.identity);
    }

    private async createTabGroup(tabs: WindowIdentity[]): Promise<void> {
        return this._tabService.createTabGroupWithTabs(tabs);
    }

    private async addTab(payload: {targetWindow: WindowIdentity, windowToAdd: WindowIdentity}): Promise<void> {
        const tabToAdd: DesktopWindow|null = this._model.getWindow(payload.windowToAdd);
        const targetTab: DesktopWindow|null = this._model.getWindow(payload.targetWindow);
        const targetGroup: DesktopTabGroup|null = targetTab && targetTab.tabGroup;

        if (!targetGroup) {
            console.error('Target Window not in a group. Try createTabGroup instead.');
            throw new Error('Target Window not in a group. Try createTabGroup instead.');
        }
        if (!tabToAdd) {
            console.error('Could not find \'windowToAdd\'.');
            throw new Error('Could not find \'windowToAdd\'.');
        }

        if (this._tabService.canTabTogether(targetTab!, tabToAdd)) {
            return targetGroup.addTab(tabToAdd);
        } else {
            console.error('The tabs provided have incompatible tabstrip URLs');
            throw new Error('The tabs provided have incompatible tabstrip URLs');
        }
    }

    private removeTab(tab: WindowIdentity): Promise<void> {
        const ejectedTab: DesktopWindow|null = this._model.getWindow(tab);
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
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.switchTab(tab!);
    }

    private async closeTab(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);

        if (tab) {
            return tab.close();
        } else {
            return Promise.reject(`No such tab: ${tabId}`);
        }
    }

    private async minimizeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.minimize();
    }

    private async maximizeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.maximize();
    }

    private async closeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        // Group will be destroyed automatically once all tabs have finished closing
        return group.removeAllTabs(true);
    }

    private async restoreTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
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

    private reorderTabs(newOrdering: WindowIdentity[], tabstrip: ProviderIdentity): void {
        if (Array.isArray(newOrdering) && (!newOrdering || newOrdering.length === 0)) {
            throw new Error('Invalid new Order array');
        }

        const tab: DesktopWindow|null = this._model.getWindow(tabstrip as WindowIdentity);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            console.error('No tab group found for window');
            throw new Error('No tab group found for window');
        }

        return group.reOrderTabArray(newOrdering);
    }

    private updateTabProperties(payload: {properties: Partial<TabProperties>, window: WindowIdentity}): void {
        const tab: DesktopWindow|null = this._model.getWindow(payload.window);

        if (!tab) {
            console.error('No tab found for window');
            throw new Error('No tab found for window');
        } else {
            return this._tabService.updateTabProperties(tab, payload.properties);
        }
    }

    private startDrag(payload: WindowIdentity, source: ProviderIdentity): void {
        let tab: DesktopWindow|null;
        let group: DesktopTabGroup|null;


        // Previous client version had no payload. To avoid breaking changes, we
        // default to the active tab if no window is specified.
        if (!payload) {
            group = this._model.getTabGroup(this._model.getId(source as WindowIdentity));
            tab = group && group.activeTab;
        } else {
            tab = this._model.getWindow(payload);
            group = tab && tab.tabGroup;
        }

        if (!group || !tab) {
            console.error('Window is not registered for tabbing');
            throw new Error('Window is not registered for tabbing');
        }

        this._tabService.dragWindowManager.showWindow(tab);
    }

    private async endDrag(): Promise<void> {
        this._tabService.dragWindowManager.hideWindow();
    }
}
