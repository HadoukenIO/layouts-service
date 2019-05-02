import {Identity} from 'hadouken-js-adapter';
import {Action, ProviderIdentity} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/channel';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {AddTabPayload, CreateTabGroupPayload, RegisterAPI, SERVICE_CHANNEL, SetTabstripPayload, SnapAndDockAPI, TabAPI, UpdateTabPropertiesPayload, WorkspaceAPI} from '../client/internal';

import {ErrorType, getErrorMessage, MessageMap} from './APIMessages';
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
    public async sendToClient<K extends keyof MessageMap, R = void>(identity: Identity, action: K, payload: MessageMap[K]): Promise<R|undefined> {
        return this._providerChannel.dispatch(identity, action, payload);
    }

    /**
     * Sends a message to all connected clients.
     */
    public async sendToAll<K extends keyof MessageMap>(action: K, payload: MessageMap[K]): Promise<void> {
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
        this.registerListener(SnapAndDockAPI.GET_DOCKED_WINDOWS, this.getDockedWindows);

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
        this.registerListener(TabAPI.TAB_WINDOW_TO_WINDOW, this.addTab);
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
            throw new Error(getErrorMessage(ErrorType.UNEXPECTED, {action: 'registering', error}));
        }
    }

    private async deregister(identity: WindowIdentity, id: ProviderIdentity): Promise<void> {
        try {
            this._model.deregister(identity, {level: 'window', uuid: id.uuid, name: id.name || id.uuid});
        } catch (error) {
            console.error(error);
            throw new Error(getErrorMessage(ErrorType.UNEXPECTED, {action: 'deregistering', error}));
        }
    }

    private async undockWindow(identity: WindowIdentity): Promise<void> {
        return this._snapService.undock(identity);
    }

    private async undockGroup(identity: WindowIdentity): Promise<void> {
        return this._snapService.explodeGroup(identity);
    }

    private async getDockedWindows(identity: WindowIdentity) {
        const targetWindow: DesktopWindow | null = this._model.getWindow(identity);

        if (!targetWindow) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, identity));
        }

        if (targetWindow.snapGroup.entities.length === 1) {
            // Window is not docked
            return null;
        }

        return targetWindow.snapGroup.entities.map(entity => {
            if (entity instanceof DesktopTabGroup) {
                // Tabgroups are represented as an array of identities
                return entity.tabs.map(tab => tab.identity);
            } else {
                return entity.identity;
            }
        });
    }

    private appReady(payload: void, identity: Identity): void {
        appReadyForRestore(identity.uuid);
    }

    private setTabstrip(payload: SetTabstripPayload) {
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

    private async createTabGroup(payload: CreateTabGroupPayload): Promise<void> {
        return this._tabService.createTabGroupWithTabs(payload.windows, payload.activeTab);
    }

    private async addTab(payload: AddTabPayload): Promise<void> {
        const tabToAdd: DesktopWindow|null = this._model.getWindow(payload.windowToAdd);
        const targetTab: DesktopWindow|null = this._model.getWindow(payload.targetWindow);

        if (!tabToAdd) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, payload.windowToAdd));
        }

        if (!targetTab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, payload.targetWindow));
        }

        if (tabToAdd === targetTab) {
            throw new Error('You cannot tab a window to itself.');
        }

        if (this._tabService.canTabTogether(targetTab, tabToAdd)) {
            const targetGroup: DesktopTabGroup|null = targetTab.tabGroup;
            if (targetGroup) {
                return targetGroup.addTab(tabToAdd);
            } else {
                return this._tabService.createTabGroupWithTabs([payload.targetWindow, payload.windowToAdd], payload.windowToAdd);
            }
        } else {
            console.error('The tabs provided have incompatible tabstrip URLs');
            throw new Error('The tabs provided have incompatible tabstrip URLs');
        }
    }

    private async removeTab(tab: WindowIdentity) {
        const ejectedTab: DesktopWindow|null = this._model.getWindow(tab);
        const tabGroup: DesktopTabGroup|null = ejectedTab && ejectedTab.tabGroup;

        if (tabGroup) {
            return tabGroup.removeTab(ejectedTab!);
        } else if (!ejectedTab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tab));
        }
    }

    private setActiveTab(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tabId));
        }

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, tabId));
        }

        return group.switchTab(tab!);
    }

    private async closeTab(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tabId));
        }

        return tab.close();
    }

    private async minimizeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tabId));
        }

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, tabId));
        }

        return group.minimize();
    }

    private async maximizeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tabId));
        }

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, tabId));
        }

        return group.maximize();
    }

    private async closeTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tabId));
        }

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, tabId));
        }

        // Group will be destroyed automatically once all tabs have finished closing
        return group.removeAllTabs(true);
    }

    private async restoreTabGroup(tabId: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabId);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, tabId));
        }

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, tabId));
        }

        return group.restore();
    }

    private reorderTabs(newOrdering: WindowIdentity[], tabstrip: ProviderIdentity): void {
        if (!Array.isArray(newOrdering) || newOrdering.length === 0) {
            throw new Error('Invalid new Order array');
        }

        const tab: DesktopWindow|null = this._model.getWindow(tabstrip as WindowIdentity);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, tabstrip as WindowIdentity));
        }

        return group.reorderTabArray(newOrdering);
    }

    private updateTabProperties(payload: UpdateTabPropertiesPayload): void {
        const tab: DesktopWindow|null = this._model.getWindow(payload.window);

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, payload.window));
        }

        return this._tabService.updateTabProperties(tab, payload.properties);
    }

    private startDrag(identity: WindowIdentity, source: ProviderIdentity): void {
        const tab: DesktopWindow|null = this._model.getWindow(identity);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (!tab) {
            throw new Error(getErrorMessage(ErrorType.NO_WINDOW, identity));
        }

        if (!group) {
            throw new Error(getErrorMessage(ErrorType.NO_TAB_GROUP, identity));
        }

        this._tabService.dragWindowManager.showWindow(tab);
    }

    private async endDrag(): Promise<void> {
        this._tabService.dragWindowManager.hideWindow();
    }
}
