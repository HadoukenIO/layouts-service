import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {TabApiEvents} from '../../client/APITypes';
import {TabGroupEventPayload, TabIdentifier, TabPackage, TabWindowOptions} from '../../client/types';
import {getClientConnection} from '../workspaces/utils';

import {GroupWindow} from './GroupWindow';
import {Tab} from './Tab';
import {TabService} from './TabService';
import {uuidv4} from './TabUtilities';

/**
 * Handles functionality for the TabSet
 */
export class TabGroup {
    /**
     * The ID for the TabGroup.
     */
    public readonly ID: string;

    /**
     * Handle to this tabgroups window.
     */
    private _window: GroupWindow;

    /**
     * Tabs currently in this tab group.
     */
    private _tabs: Tab[];

    /**
     * The active tab in the tab group.
     */
    private _activeTab!: Tab;

    private _isRestored = false;

    /**
     * Handle to the service provider
     */
    private mService: ChannelProvider;

    /**
     * Constructor for the TabGroup Class.
     * @param {TabWindowOptions} windowOptions
     */
    constructor(windowOptions: TabWindowOptions) {
        this.ID = uuidv4();
        this._tabs = [];
        this._window = new GroupWindow(windowOptions, this);
        this.mService = (window as Window & {providerChannel: ChannelProvider}).providerChannel;
    }

    /**
     * Initializes the tab group window.  This will initalize tabs in the group, show the window, and handle alignment.
     */
    private async _initializeTabGroup() {
        await this._window.init();
        if (!this._isRestored) {
            await this._window.alignPositionToApp(this._tabs[0].window);
        }
    }

    public async addTab(tab: Tab, handleTabSwitch = true, handleAlignment = true, index = -1) {
        if (!(tab instanceof Tab)) {
            throw new Error(`${tab} is not a valid Tab object`);
        }
        const existingTab = TabService.INSTANCE.getTab(tab.ID);

        if (existingTab) {
            console.info('Existing tab attempting to be added.  Removing the first instance...');
            await existingTab.tabGroup.removeTab(existingTab.ID, false, true, true);
        }

        tab.tabGroup = this;

        if (index > -1 && index <= this.tabs.length) {
            this._tabs.splice(index, 0, tab);
        } else {
            this._tabs.push(tab);
        }

        if (this._tabs.length === 1) {
            if (!this._isRestored) {
                const firstTabConfig = TabService.INSTANCE.applicationConfigManager.getApplicationUIConfig(tab.ID.uuid) || {};

                const bounds = await tab.window.getWindowBounds();
                this._window.updateInitialWindowOptions(
                    Object.assign({}, firstTabConfig as object, {width: bounds.width, screenX: bounds.left, screenY: bounds.top}));
            }

            await this._initializeTabGroup();
        }

        if (handleAlignment && this._tabs.length || this._isRestored) {
            await tab.window.alignPositionToTabGroup();
        }

        tab.sendTabbedEvent();

        if (handleTabSwitch) {
            await this.switchTab(tab.ID);
        } else {
            await tab.window.hide();
        }

        this.window.finWindow.bringToFront();

        return tab;
    }

    /**
     * Realigns all tab windows of the group to the position of the tab set window.
     */
    public realignApps() {
        return Promise.all(this._tabs.map(tab => {
            return tab.window.alignPositionToTabGroup();
        }));
    }


    /**
     * Reorders the tab structure to match what is present in the UI.
     * @param {TabIdentifier[]} orderReference The order which we should rearrange our tabs to match.  This will come from the UI component.
     */
    public reOrderTabArray(orderReference: TabIdentifier[]): boolean {
        const newlyOrdered = orderReference
                                 .map((ref) => this._tabs.find((tab, i) => {
                                     if (tab.ID.name === ref.name && tab.ID.uuid === ref.uuid) {
                                         return true;
                                     }
                                     return false;
                                 }))
                                 .filter((tab: Tab|undefined) => tab !== undefined);

        if (newlyOrdered.length === this._tabs.length) {
            this._tabs = newlyOrdered as Tab[];
            return true;
        } else {
            console.error('Input array must reference each tab exactly once');
            return false;
        }
    }

    /**
     * Deregisters the Tab from tabbing altogether.
     * @param ID ID (uuid, name) of the Tab to deregister.
     */
    public async deregisterTab(ID: TabIdentifier): Promise<void> {
        const tab = this.getTab(ID);

        await this.removeTab(ID, false, true);

        if (tab) {
            tab.window.updateWindowOptions({frame: true});
            return tab.window.showWindow();
        }
    }

    /**
     * Removes a specified tab from the tab group.
     * @param {TabIdentifier} tabID The Tabs ID to remove.
     * @param {boolean} closeApp Flag to force close the tab window or not.
     * @param {boolean} closeGroupWindowCheck Flag to check if we should close the tab set window if there are no more tabs.
     */
    public async removeTab(tabID: TabIdentifier, closeApp: boolean, closeGroupWindowCheck = false, switchTab = true, restoreWindowState = true): Promise<void> {
        const index: number = this.getTabIndex(tabID);

        if (index === -1) {
            return;
        }


        const tab = this._tabs[index];
        this._tabs.splice(index, 1);

        if (switchTab && this._tabs.length > 0 && this.activeTab.ID.uuid === tab.ID.uuid && this.activeTab.ID.name === tab.ID.name) {
            const nextTab: TabIdentifier = this._tabs[index] ? this._tabs[index].ID : this._tabs[index - 1].ID;

            if (this.tabs.length === 1) {
                this.tabs[0].window.show();
            } else {
                await this.switchTab(nextTab);
            }
        }

        await tab.remove(closeApp);
        if (restoreWindowState) {
            tab.deInit();
        }

        if (closeGroupWindowCheck) {
            if (this._tabs.length === 1) {
                await Promise.all(this._tabs.map((tab) => {
                    tab.deInit();
                    tab.window.show();
                }));

                await TabService.INSTANCE.removeTabGroup(this.ID, false);
                return;
            }
        }
    }

    /**
     * Switches the active Tab in the group. Hides current active window.
     * @param {TabIdentifier} ID The ID of the tab to set as active.
     * @param {boolean} hideActiveTab Flag if we should hide the current active tab.
     */
    public async switchTab(ID: TabIdentifier, hideActiveTab = true): Promise<void> {
        const tab = this.getTab(ID);
        if (tab && tab !== this._activeTab) {
            await tab.window.showWindow();
            tab.window.finWindow.bringToFront();
            if (this._activeTab) {
                await this._activeTab.window.hideWindow();
            }
            this.setActiveTab(tab);
        }
    }


    public async hideAllTabsMinusActiveTab() {
        return Promise.all(this.tabs.map((tab) => {
            if (tab.ID.name === this.activeTab.ID.name && tab.ID.uuid === this.activeTab.ID.uuid) {
                return;
            } else {
                return tab.window.hide();
            }
        }));
    }

    /**
     * Removes all tabs from this tab set.
     * @param closeApp Flag if we should close the tab windows.
     */
    public removeAllTabs(closeApp: boolean): Promise<void[]> {
        const refArray = this._tabs.slice();
        const refArrayMap = refArray.map(tab => {
            this.removeTab(tab.ID, closeApp, true, false, !closeApp);
        });

        return Promise.all(refArrayMap);
    }

    /**
     * Gets the tab with the specified identifier
     * @param tabID The tab identifier
     */
    public getTab(tabID: TabIdentifier): Tab|undefined {
        return this.tabs.find((tab: Tab) => {
            return tab.ID.uuid === tabID.uuid && tab.ID.name === tabID.name;
        });
    }

    /**
     * Sets the active tab.  Does not switch tabs or hide/show windows.
     * @param {Tab} tab The Tab to set as active.
     */
    public setActiveTab(tab: Tab): void {
        this._activeTab = tab;
        const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: tab.ID};
        const tabStripConnection = getClientConnection({uuid: fin.Application.me.uuid, name: this.ID});
        if (tabStripConnection) {
            this.mService.dispatch(tabStripConnection, 'tab-activated', payload);
        }
    }

    /**
     * Finds the index of the specified Tab in the array.
     * @param tabID The ID of the Tab.
     * @returns {number} Index Number.
     */
    public getTabIndex(tabID: TabIdentifier): number {
        return this.tabs.findIndex((tab: Tab) => {
            return tab.ID.uuid === tabID.uuid && tab.ID.name === tabID.name;
        });
    }

    /**
     * Returns the current active tab of the tab set.
     * @returns {Tab} The Active Tab
     */
    public get activeTab(): Tab {
        return this._activeTab || this.tabs[0];
    }

    /**
     * Returns the tab sets window.
     * @returns {GroupWindow} The group window.
     */
    public get window(): GroupWindow {
        return this._window;
    }

    /**
     * Returns the tabs of this tab set.
     * @returns {Tab[]} Array of tabs.
     */
    public get tabs(): Tab[] {
        return this._tabs;
    }

    public set isRestored(isRestored: boolean) {
        this._isRestored = isRestored;
    }
}
