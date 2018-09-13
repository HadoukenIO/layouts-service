import {Identity, Window as FinWindow} from 'hadouken-js-adapter';
import {Provider} from 'hadouken-js-adapter/out/types/src/api/services/provider';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ApplicationUIConfig, TabGroupEventPayload, TabIdentifier, TabServiceID, TabWindowOptions} from '../../client/types';
import {Signal1} from '../Signal';
import {DEFAULT_UI_URL} from '../tabbing/components/ApplicationConfigManager';
import {Tab} from '../tabbing/Tab';
import {TabService} from '../tabbing/TabService';
import {uuidv4} from '../tabbing/TabUtilities';
import {TabWindow} from '../tabbing/TabWindow';

import {DesktopEntity} from './DesktopEntity';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopWindow, WindowIdentity, WindowState} from './DesktopWindow';

// tslint:disable-next-line:no-any
declare var fin: any;


/**
 * Handles functionality for the TabSet
 */
export class DesktopTabGroup extends DesktopEntity {
    public static readonly onCreated: Signal1<DesktopTabGroup> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopTabGroup> = new Signal1();

    private static tabStripOptions: fin.WindowOptions = {url: DEFAULT_UI_URL, defaultHeight: 60, frame: false, maximizable: false};
    // private static tabStripPool: FinWindow[] = (() => {
    //     const pool: FinWindow[] = [];
    //     console.log("A");
    //     for(let i=0; i<5; i++) {
    //         DesktopTabGroup.createTabStrip("X" + i + uuidv4());
    //         console.log("C " + i);
    //     }
    //     return pool;
    // })();

    // private static createTabStrip(name: string): void {
    //     console.log("B " + name);
    //     //tslint:disable-next-line:no-debugger
    //     debugger;
    //     const identity: WindowIdentity = {uuid: 'layouts-service', name};
    //     const options: fin.WindowOptions = {name: identity.name, ...DesktopTabGroup.tabStripOptions};
    //     fin.Window.create(options).then((window: FinWindow) => DesktopTabGroup.tabStripPool.push(window));
    // }

    /**
     * The ID for the TabGroup.
     */
    public readonly ID: string;

    /**
     * Handle to this tabgroups window.
     */
    private _window: DesktopWindow;

    /**
     * Tabs currently in this tab group.
     */
    private _tabs: Tab[];

    /**
     * The active tab in the tab group.
     */
    private _activeTab!: Tab;

    private _isRestored: boolean;
    private _isMaximized: boolean;
    private _beforeMaximizeBounds: fin.WindowBounds|undefined;

    /**
     * Handle to the service provider
     */
    private mService: Provider;

    private _config: ApplicationUIConfig;

    /**
     * Constructor for the TabGroup Class.
     * @param {ApplicationUIConfig} windowOptions
     */
    constructor(group: DesktopSnapGroup, options: TabWindowOptions) {
        super(group, {uuid: TabServiceID.UUID, name: uuidv4()});

        // if (DesktopTabGroup.tabStripPool.length > 0) {
        //     const initialState: WindowState = {
        //         center: {x: options.x + (options.width / 2), y: options.y + (options.height / 2)},
        //         halfSize: {x: options.width / 2, y: options.height / 2},
        //         frame: false,
        //         hidden: false,
        //         state: 'normal',
        //         minWidth: -1,
        //         maxWidth: -1,
        //         minHeight: 0,
        //         maxHeight: 0,
        //         opacity: 1
        //     };
        //     const tabstrip = DesktopTabGroup.tabStripPool.pop()!;
        //     tabstrip.updateOptions({minHeight: options.height});
        //     tabstrip.show();
        //     this._window = new DesktopWindow(group, tabstrip, initialState);
        //     this.ID = tabstrip.identity.name!;
        // } else {
        this.ID = this.identity.name;
        this.getTabStrip(this.identity.name, options);
        this._window = new DesktopWindow(group, this.identity);
        // }
        this._tabs = [];
        this._config = options;

        this._isRestored = false;
        this._isMaximized = false;
        this.mService = (window as Window & {providerChannel: Provider}).providerChannel;

        DesktopTabGroup.onCreated.emit(this);
    }

    public get config(): ApplicationUIConfig {
        return this._config;
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
     * @returns {DesktopWindow} The group window.
     */
    public get window(): DesktopWindow {
        return this._window;
    }

    public get snapGroup(): DesktopSnapGroup {
        return this._window.getGroup();
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

    public get isMaximized(): boolean {
        return this._isMaximized;
    }

    /**
     * Toggles the window to a maximized state.  If the window is maximized we will restore it, if not we will maximize it.
     */
    public async toggleMaximize(): Promise<void|void[]> {
        if (this._isMaximized) {
            return this.restore();
        } else {
            return this.maximize();
        }
    }

    /**
     * Maximizes the tab set window.  This will resize the tab window to as large as possible with the tab set window on top.
     */
    public async maximize(): Promise<void> {
        if (!this._isMaximized) {
            this._beforeMaximizeBounds = await this.activeTab.window.getWindowBounds();

            const moveto = this.window.getWindow().moveTo(0, 0);
            const tabresizeto = this.activeTab.window.resizeTo(screen.availWidth, screen.availHeight - this._config.height!, 'top-left');

            await Promise.all([moveto, tabresizeto]);

            this._isMaximized = true;
        }
    }

    /**
     * Restores the tab set window.  If the tab set window is in a maximized state we will restore the window to its "before maximized" bounds.
     */
    public async restore(): Promise<void|void[]> {
        if (this._isMaximized) {
            if (await this.activeTab.window.getState() === 'minimized') {
                await Promise.all(this.tabs.map(tab => tab.window.restore()));
                return this.hideAllTabsMinusActiveTab();
            } else if (this._beforeMaximizeBounds) {
                const resize = this.activeTab.window.resizeTo(this._beforeMaximizeBounds.width, this._beforeMaximizeBounds.height, 'top-left');
                const moveto = this.window.getWindow().moveTo(this._beforeMaximizeBounds.left, this._beforeMaximizeBounds.top - (this._config.height || 62));
                this._isMaximized = false;
                return Promise.all([resize, moveto]);
            }
        } else {
            await Promise.all(this.tabs.map(tab => tab.window.restore()));
            return this.hideAllTabsMinusActiveTab();
        }
    }

    /**
     * Minimizes the tab set window and all tab windows.
     */
    public async minimize() {
        const minWins = this.tabs.map(tab => {
            return tab.window.minimize();
        });

        const group = this._window.getWindow().minimize();

        return Promise.all([minWins, group]);
    }

    /**
     * Closes the tab set window and all its apps.
     */
    public async closeAll(): Promise<void> {
        return this.removeAllTabs(true);
    }

    private async getTabStrip(name: string, options: TabWindowOptions): Promise<void> {  // Promise<DesktopWindow> {
        const windowOptions: fin.WindowOptions = {
            name,
            url: options.url,
            autoShow: true,
            defaultLeft: options.x,
            defaultTop: options.y,
            defaultWidth: options.width,
            defaultHeight: options.height,
            minHeight: options.height,
            maxHeight: options.height,
            frame: false,
            maximizable: false,
            resizable: false,
            saveWindowState: false,
            taskbarIconGroup: name,
            //@ts-ignore
            backgroundThrottling: true,
            waitForPageLoad: false
        };
        const tabstrip: FinWindow = /*DesktopTabGroup.tabStripPool.pop() ||*/ await fin.Window.create(windowOptions);

        // const state: WindowState = {
        //     center: {x: options.x + (options.width / 2), y: options.y + (options.height / 2)},
        //     halfSize: {x: options.width / 2, y: options.height / 2},
        //     frame: false,
        //     hidden: false,
        //     state: 'normal',
        //     minWidth: -1,
        //     maxWidth: -1,
        //     minHeight: 0,
        //     maxHeight: 0,
        //     opacity: 1
        // };
        // const window: DesktopWindow = new DesktopWindow(new DesktopSnapGroup(), tabstrip!, state);
        // await window.sync();

        // return window;
    }

    /**
     * Initializes the tab group window.  This will initalize tabs in the group, show the window, and handle alignment.
     */
    private async _initializeTabGroup() {
        // await this._window.init();
        // if (!this._isRestored) {
        //     await this.alignTabWindow(this._tabs[0]);
        // }
    }

    private async alignTabWindow(tab: DesktopWindow): Promise<void> {
        const tabstripWindow: FinWindow = this.window.getWindow();
        const appWindow: FinWindow = tab.getWindow();

        await tabstripWindow.leaveGroup();
        const bounds = await appWindow.getBounds();

        const state: WindowState = this.window.getState();
        const resizeTo = tabstripWindow.resizeTo(bounds.width!, state.halfSize.y * 2, 'top-left');
        await appWindow.resizeTo(bounds.width, bounds.height - state.halfSize.y * 2, 'bottom-left');

        const moveTo = tabstripWindow.moveTo(bounds.left!, bounds.top!);

        await Promise.all([resizeTo, moveTo]);
        appWindow.joinGroup(tabstripWindow);
    }

    public async addTab(tab: Tab, handleTabSwitch = true, handleAlignment = true, index = -1) {
        console.log('Add ' + tab.ID.name + ' to ' + this.ID);

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
            // if (!this._isRestored) {
            //     const firstTabConfig = TabService.INSTANCE.applicationConfigManager.getApplicationUIConfig(tab.ID.uuid) || {};

            //     const bounds = await tab.window.getWindowBounds();
            //     this._window.updateInitialWindowOptions(
            //         Object.assign({}, firstTabConfig as object, {width: bounds.width, screenX: bounds.left, screenY: bounds.top}));
            // }

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

        this.window.getWindow().bringToFront();

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
                DesktopTabGroup.onDestroyed.emit(this);
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
    public removeAllTabs(closeApp: boolean): Promise<void> {
        const tabs = this._tabs.slice();
        const promises = tabs.map(tab => {
            this.removeTab(tab.ID, closeApp, true, false, !closeApp);
        });

        return Promise.all(promises).then(() => {});
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
        this.mService.dispatch({uuid: fin.desktop.Application.getCurrent().uuid, name: this.ID}, 'tab-activated', payload);
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
}
