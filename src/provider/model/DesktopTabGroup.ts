import {Window as FinWindow} from 'hadouken-js-adapter';
import {Provider} from 'hadouken-js-adapter/out/types/src/api/services/provider';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ApplicationUIConfig, TabGroupEventPayload, TabIdentifier, TabProperties, TabServiceID, TabWindowOptions, JoinTabGroupPayload} from '../../client/types';
import {Signal1} from '../Signal';
import {DEFAULT_UI_URL} from '../tabbing/components/ApplicationConfigManager';
import {TabService} from '../tabbing/TabService';
import {uuidv4} from '../tabbing/TabUtilities';

import {DesktopEntity} from './DesktopEntity';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopWindow, WindowIdentity, WindowState} from './DesktopWindow';
import { TabApiEvents } from '../../client/APITypes';

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
    private _tabs: DesktopWindow[];

    /**
     * The active tab in the tab group.
     */
    private _activeTab!: DesktopWindow;

    /**
     * The properties (title, icon) for the tab.
     */
    private _tabProperties: {[id: string]: TabProperties};

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
        super({uuid: TabServiceID.UUID, name: uuidv4()});

        const tabStripOptions: fin.WindowOptions = {
            name: this.identity.name,
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
            //@ts-ignore 'backgroundThrottling' missing from TypeScript interface
            backgroundThrottling: true,
            waitForPageLoad: false
        };

        this.ID = this.identity.name;
        this._window = new DesktopWindow(group, tabStripOptions);
        this._tabs = [];
        this._tabProperties = {};
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
     * @returns {DesktopWindow} The Active Tab
     */
    public get activeTab(): DesktopWindow {
        return this._activeTab || this.tabs[0];
    }

    /**
     * Returns the tab sets window.
     * @returns {DesktopWindow} The group window.
     */
    public get window(): DesktopWindow {
        return this._window;
    }

    /**
     * Returns the tabs of this tab set.
     * @returns {DesktopWindow[]} Array of tabs.
     */
    public get tabs(): DesktopWindow[] {
        return this._tabs;
    }

    public set isRestored(isRestored: boolean) {
        this._isRestored = isRestored;
    }

    public get isMaximized(): boolean {
        return this._isMaximized;
    }

    public getSnapGroup(): DesktopSnapGroup {
        return this._window.getSnapGroup();
    }

    public updateTabProperties(tab: DesktopWindow, properties: TabProperties): void {
        this._tabProperties[tab.getId()] = properties;

        fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this.ID, TabApiEvents.PROPERTIESUPDATED, {tabID: this.ID, tabProps: properties});
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
            this._beforeMaximizeBounds = await this.activeTab.getWindow().getBounds();

            const moveto = this.window.getWindow().moveTo(0, 0);
            const tabresizeto = this.activeTab.getWindow().resizeTo(screen.availWidth, screen.availHeight - this._config.height!, 'top-left');

            await Promise.all([moveto, tabresizeto]);

            this._isMaximized = true;
        }
    }

    /**
     * Restores the tab set window.  If the tab set window is in a maximized state we will restore the window to its "before maximized" bounds.
     */
    public async restore(): Promise<void|void[]> {
        if (this._isMaximized) {
            if (await this.activeTab.getWindow().getState() === 'minimized') {
                await Promise.all(this.tabs.map(tab => tab.getWindow().restore()));
                return this.hideAllTabsMinusActiveTab();
            } else if (this._beforeMaximizeBounds) {
                const resize = this.activeTab.getWindow().resizeTo(this._beforeMaximizeBounds.width, this._beforeMaximizeBounds.height, 'top-left');
                const moveto = this.window.getWindow().moveTo(this._beforeMaximizeBounds.left, this._beforeMaximizeBounds.top - (this._config.height || 62));
                this._isMaximized = false;
                return Promise.all([resize, moveto]);
            }
        } else {
            await Promise.all(this.tabs.map(tab => tab.getWindow().restore()));
            return this.hideAllTabsMinusActiveTab();
        }
    }

    /**
     * Minimizes the tab set window and all tab windows.
     */
    public async minimize() {
        const minWins = this.tabs.map(tab => {
            return tab.getWindow().minimize();
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
     * Aligns the tabstrip to the top of the given window
     */
    // private async alignTabWindow(tab: DesktopWindow): Promise<void> {
    //     const tabstripWindow: FinWindow = this.window.getWindow();
    //     const appWindow: FinWindow = tab.getWindow();

    //     await tabstripWindow.leaveGroup();
    //     const bounds = await appWindow.getBounds();

    //     const state: WindowState = this.window.getState();
    //     const resizeTo = tabstripWindow.resizeTo(bounds.width!, state.halfSize.y * 2, 'top-left');
    //     await appWindow.resizeTo(bounds.width, bounds.height - state.halfSize.y * 2, 'bottom-left');

    //     const moveTo = tabstripWindow.moveTo(bounds.left!, bounds.top!);

    //     await Promise.all([resizeTo, moveTo]);
    //     appWindow.joinGroup(tabstripWindow);
    // }

    /**
     * Aligns the given tab window to the position of the tab strip
     */
    // private async alignPositionToTabGroup(tab: DesktopWindow): Promise<void> {
    //     await tab.getWindow().leaveGroup();
    //     const groupWindow = this.window;
    //     const groupActiveTab = this.activeTab || this.tabs[0];

    //     const tabGroupBoundsP = groupWindow.getWindow().getBounds();
    //     const tabBoundsP = groupActiveTab ? groupActiveTab.getWindow().getBounds() : this.window.getWindow().getBounds();

    //     const [tabGroupBounds, tabBounds] = await Promise.all([tabGroupBoundsP, tabBoundsP]);

    //     const resize = this._window.getWindow().resizeTo(tabGroupBounds.width, tabBounds.height, 'top-left');
    //     const moveTo = this._window.getWindow().moveTo(tabGroupBounds.left, tabGroupBounds.top + tabGroupBounds.height);
    //     await Promise.all([resize, moveTo]);

    //     await this._window.getWindow().joinGroup(groupWindow.getWindow());
    // }

    public async addTab(tab: DesktopWindow, handleTabSwitch = true, handleAlignment = true, index = -1) {
        console.log('Add ' + tab.getIdentity().name + ' to ' + this.ID);

        if (tab.getTabGroup()) {
            console.info('Existing tab attempting to be added.  Removing the first instance...');
            await tab.getTabGroup()!.removeTab(tab.getIdentity(), false, true, true);
        }

        await Promise.all([this.sync(), this._window.sync(), tab.sync()]);

        this._tabProperties[tab.getId()] = {
            icon: tab.getState().icon,
            title: tab.getState().title
        };

        if (index > -1 && index <= this.tabs.length) {
            this._tabs.splice(index, 0, tab);
        } else {
            this._tabs.push(tab);
        }


        if (this.tabs.length === 1) {
            const tabState: WindowState = tab.getState();
            const halfHeight: number = tabState.halfSize.y - (this._config.height / 2);

            //Align tabstrip to this tab
            await this._window.applyProperties({
                center: {x: tabState.center.x, y: tabState.center.y - tabState.halfSize.y + (this._config.height / 2)},
                halfSize: {x: tabState.halfSize.x, y: this._config.height / 2}
            });

            // Reduce size of app window by size of tabstrip
            await tab.applyProperties({
                center: {x: tabState.center.x, y: tabState.center.y + (this._config.height / 2)},
                halfSize: {x: tabState.halfSize.x, y: halfHeight}
            });
        } else {
            const tabState: WindowState = this._tabs[0].getState();
            const tabstripState: WindowState = this._window.getState();
            const halfHeight: number = tabState.halfSize.y;

            // Align tab with existing tab
            await tab.applyProperties({
                center: {x: tabstripState.center.x, y: tabstripState.center.y + tabstripState.halfSize.y + halfHeight},
                halfSize: {x: tabstripState.halfSize.x, y: halfHeight}
            });
        }
        
        tab.setSnapGroup(this._window.getSnapGroup());
        tab.setTabGroup(this);
        this.switchTab(tab.getIdentity(), true);

        this.addPendingActions(Promise.all([this.sync(), this.window.sync()]).then(async () => {
            this.sendTabbedEvent(tab);
            console.log('hidden', tab !== this._activeTab);
            tab.applyProperties({hidden: tab !== this._activeTab});

            this.window.getWindow().bringToFront();
        }));

        return tab;
    }

    private sendTabbedEvent(tab: DesktopWindow): void {
        const payload: JoinTabGroupPayload = {tabGroupId: this.ID, tabID: tab.getIdentity(), tabProps: this._tabProperties[tab.getId()], index: this.getTabIndex(tab.getIdentity())};

        //Send event to application
        tab.sync().then(() => {
            this.mService.dispatch(tab.getIdentity(), 'join-tab-group', payload);
        });

        //Send event to tabstrip
        Promise.all([this.sync(), this.window.sync()]).then(() => {
            this.mService.dispatch({uuid: TabServiceID.UUID, name: this.ID}, 'join-tab-group', payload);
        });
    }

    /**
     * Realigns all tab windows of the group to the position of the tab set window.
     */
    // public realignApps() {
    //     return Promise.all(this._tabs.map(tab => {
    //         return this.alignPositionToTabGroup(tab);
    //     }));
    // }

    /**
     * Reorders the tab structure to match what is present in the UI.
     * @param {TabIdentifier[]} orderReference The order which we should rearrange our tabs to match.  This will come from the UI component.
     */
    public reOrderTabArray(orderReference: TabIdentifier[]): boolean {
        const newlyOrdered: DesktopWindow[] = orderReference.map((ref: TabIdentifier) => {
            //Look-up each given identity within list of tabs
            const refId = TabService.INSTANCE.desktopModel.getId(ref);
            return this._tabs.find((tab: DesktopWindow) => {
                return tab.getId() === refId;
            });
        }).filter((tab: DesktopWindow|undefined): tab is DesktopWindow => {
            //Remove any invalid identities
            return tab !== undefined;
        });

        if (newlyOrdered.length === this._tabs.length) {
            this._tabs = newlyOrdered;
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
            tab.applyProperties({frame: true});
            return tab.getWindow().show();
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
        delete this._tabProperties[tab.getId()];

        if (switchTab && this._tabs.length > 0 && this.activeTab.getId() === tab.getId()) {
            const nextTab: TabIdentifier = this._tabs[index] ? this._tabs[index].getIdentity() : this._tabs[index - 1].getIdentity();

            if (this.tabs.length === 1) {
                this.tabs[0].getWindow().show();
            } else {
                await this.switchTab(nextTab);
            }
        }

        tab.setSnapGroup(new DesktopSnapGroup());
        tab.setTabGroup(null);
        // await tab.remove(closeApp);
        // if (restoreWindowState) {
        //     tab.deInit();
        // }

        if (closeGroupWindowCheck) {
            if (this._tabs.length === 1) {
                await Promise.all(this._tabs.map((tab) => {
                    // tab.deInit();
                    tab.getWindow().show();
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
            await tab.getWindow().show();
            tab.getWindow().bringToFront();
            if (this._activeTab) {
                await this._activeTab.getWindow().hide();
            }
            this.setActiveTab(tab);
        }
    }


    public async hideAllTabsMinusActiveTab() {
        return Promise.all(this.tabs.map((tab) => {
            if (tab.getId() === this.activeTab.getId()) {
                return;
            } else {
                return tab.getWindow().hide();
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
            this.removeTab(tab.getIdentity(), closeApp, true, false, !closeApp);
        });

        return Promise.all(promises).then(() => {});
    }

    /**
     * Gets the tab with the specified identifier
     * @param tabID The tab identifier
     */
    public getTab(tabID: TabIdentifier): DesktopWindow|null {
        const id = `${tabID.uuid}/${tabID.name}`;
        return this.tabs.find((tab: DesktopWindow) => {
            return tab.getId() === id;
        }) || null;
    }

    /**
     * Sets the active tab.  Does not switch tabs or hide/show windows.
     * @param {DesktopWindow} tab The Tab to set as active.
     */
    public setActiveTab(tab: DesktopWindow): void {
        this._activeTab = tab;
        const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: tab.getIdentity()};
        this.mService.dispatch({uuid: fin.desktop.Application.getCurrent().uuid, name: this.ID}, 'tab-activated', payload);
    }

    /**
     * Finds the index of the specified Tab in the array.
     * @param tabID The ID of the Tab.
     * @returns {number} Index Number.
     */
    public getTabIndex(tabID: TabIdentifier): number {
        return this.tabs.findIndex((tab: DesktopWindow) => {
            const identity: WindowIdentity = tab.getIdentity();
            return identity.uuid === tabID.uuid && identity.name === tabID.name;
        });
    }
}
