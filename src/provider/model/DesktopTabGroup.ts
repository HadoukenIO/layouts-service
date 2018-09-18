import {TabApiEvents} from '../../client/APITypes';
import {ApplicationUIConfig, JoinTabGroupPayload, TabGroupEventPayload, TabIdentifier, TabProperties, TabServiceID, TabWindowOptions} from '../../client/types';
import {GroupEventType} from '../main';
import {Signal1} from '../Signal';
import {Rectangle} from '../snapanddock/utils/RectUtils';
import {sendToClient} from '../workspaces/utils';

import {DesktopEntity} from './DesktopEntity';
import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopWindow, WindowIdentity, WindowState} from './DesktopWindow';

/**
 * Handles functionality for the TabSet
 */
export class DesktopTabGroup extends DesktopEntity {
    public static readonly onCreated: Signal1<DesktopTabGroup> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopTabGroup> = new Signal1();

    /**
     * Creates a UUIDv4() ID
     * Sourced from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     */
    private static createTabGroupId(): string {
        //@ts-ignore Black Magic
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
    }


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
    private _beforeMaximizeBounds: Rectangle|undefined;

    private _config: ApplicationUIConfig;

    /**
     * Constructor for the TabGroup Class.
     * @param {ApplicationUIConfig} windowOptions
     */
    constructor(model: DesktopModel, group: DesktopSnapGroup, options: TabWindowOptions) {
        super(model, {uuid: TabServiceID.UUID, name: DesktopTabGroup.createTabGroupId()});

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
        this._window = new DesktopWindow(this.model, group, tabStripOptions);
        this._tabs = [];
        this._tabProperties = {};
        this._config = options;

        this._isRestored = false;
        this._isMaximized = false;

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

        fin.desktop.InterApplicationBus.send(
            fin.desktop.Application.getCurrent().uuid, this.ID, TabApiEvents.PROPERTIESUPDATED, {tabID: this.ID, tabProps: properties});
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
            const {center, halfSize} = this._activeTab.getState();
            this._beforeMaximizeBounds = {center: {...center}, halfSize: {...halfSize}};

            await this.window.applyProperties(
                {center: {x: screen.availWidth / 2, y: this._config.height / 2}, halfSize: {x: screen.availWidth / 2, y: this._config.height / 2}});
            await this.activeTab.applyProperties({
                center: {x: screen.availWidth / 2, y: (screen.availHeight + this._config.height) / 2},
                halfSize: {x: screen.availWidth / 2, y: (screen.availHeight - this._config.height) / 2}
            });

            this._isMaximized = true;
        }
    }

    /**
     * Restores the tab set window.  If the tab set window is in a maximized state we will restore the window to its "before maximized" bounds.
     */
    public async restore(): Promise<void|void[]> {
        if (this._isMaximized) {
            if (await this.activeTab.getState().state === 'minimized') {
                await Promise.all(this.tabs.map(tab => tab.applyProperties({state: 'normal'})));
                return this.hideAllTabsMinusActiveTab();
            } else if (this._beforeMaximizeBounds) {
                this._isMaximized = false;

                const bounds: Rectangle = this._beforeMaximizeBounds;
                await this.window.applyProperties({
                    center: {x: bounds.center.x, y: bounds.center.y - bounds.halfSize.y - (this._config.height / 2)},
                    halfSize: {x: bounds.halfSize.x, y: this._config.height / 2}
                });
                return this.activeTab.applyProperties(bounds);
            }
        } else {
            await Promise.all(this.tabs.map(tab => tab.applyProperties({state: 'normal'})));
            return this.hideAllTabsMinusActiveTab();
        }
    }

    /**
     * Minimizes the tab set window and all tab windows.
     */
    public async minimize(): Promise<void> {
        const minWins = this.tabs.map(tab => {
            return tab.applyProperties({state: 'minimized'});
        });
        const group = this._window.applyProperties({state: 'minimized'});

        return Promise.all([minWins, group]).then(() => {});
    }

    /**
     * Closes the tab set window and all its apps.
     */
    public async closeAll(): Promise<void> {
        return this.removeAllTabs(true);
    }

    public async addTab(tab: DesktopWindow, handleTabSwitch = true, handleAlignment = true, index = -1) {
        console.log('Add ' + tab.getIdentity().name + ' to ' + this.ID);

        if (tab.getTabGroup()) {
            console.info('Existing tab attempting to be added.  Removing the first instance...');
            await tab.getTabGroup()!.removeTab(tab);
        }

        await Promise.all([this.sync(), this._window.sync(), tab.sync()]);

        this._tabProperties[tab.getId()] = {icon: tab.getState().icon, title: tab.getState().title};

        if (index > -1 && index <= this.tabs.length) {
            this._tabs.splice(index, 0, tab);
        } else {
            this._tabs.push(tab);
        }


        if (this.tabs.length === 1) {
            const tabState: WindowState = tab.getState();
            const halfHeight: number = tabState.halfSize.y - (this._config.height / 2);

            // Align tabstrip to this tab
            await this._window.applyProperties({
                center: {x: tabState.center.x, y: tabState.center.y - tabState.halfSize.y + (this._config.height / 2)},
                halfSize: {x: tabState.halfSize.x, y: this._config.height / 2}
            });

            // Reduce size of app window by size of tabstrip
            await tab.applyProperties(
                {center: {x: tabState.center.x, y: tabState.center.y + (this._config.height / 2)}, halfSize: {x: tabState.halfSize.x, y: halfHeight}});
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
        this.switchTab(tab);

        this.addPendingActions(Promise.all([this.sync(), this.window.sync()]).then(async () => {
            const payload: JoinTabGroupPayload =
                {tabGroupId: this.ID, tabID: tab.getIdentity(), tabProps: this._tabProperties[tab.getId()], index: this.getTabIndex(tab.getIdentity())};

            this.sendTabEvent(tab, GroupEventType.JOIN_TAB_GROUP, payload);
            tab.applyProperties({hidden: tab !== this._activeTab});

            this.window.bringToFront();
        }));

        return tab;
    }

    public async swapTab(tabToRemove: DesktopWindow, tabToAdd: DesktopWindow): Promise<void> {
        const tabIndex = this.tabs.indexOf(tabToRemove!);

        if (tabIndex >= 0) {
            this._tabs.splice(tabIndex, 1, tabToAdd);
            await this.addTab(tabToAdd, false, true, tabIndex);
            await this._removeTab(tabToRemove);

            if (this._activeTab.getId() === tabToAdd.getId()) {
                // if the switchedwith tab was the active one, we make the added tab active
                this.switchTab(tabToAdd);
            } else {
                // else we hide it because the added tab might be visible.
                tabToAdd.applyProperties({hidden: true});
            }
        } else {
            throw new Error(`Cannot swap tabs - ${tabToRemove && tabToRemove.getId()} doesn't exist within tab set`);
        }
    }

    private sendTabEvent<T extends TabGroupEventPayload>(tab: DesktopWindow, event: GroupEventType, payload: T): void {
        console.log('Sending ' + event + ' to ' + tab.getId());

        // Send event to application
        tab.sync().then(() => {
            sendToClient(tab.getIdentity(), event, payload);
        });

        // Send event to tabstrip
        Promise.all([this.sync(), this.window.sync()]).then(() => {
            sendToClient({uuid: TabServiceID.UUID, name: this.ID}, event, payload);
        });
    }

    /**
     * Reorders the tab structure to match what is present in the UI.
     * @param {TabIdentifier[]} orderReference The order which we should rearrange our tabs to match.  This will come from the UI component.
     */
    public reOrderTabArray(orderReference: TabIdentifier[]): boolean {
        const newlyOrdered: DesktopWindow[] = orderReference
                                                  .map((ref: TabIdentifier) => {
                                                      // Look-up each given identity within list of tabs
                                                      const refId = this.model.getId(ref);
                                                      return this._tabs.find((tab: DesktopWindow) => {
                                                          return tab.getId() === refId;
                                                      });
                                                  })
                                                  .filter((tab: DesktopWindow|undefined): tab is DesktopWindow => {
                                                      // Remove any invalid identities
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
     * Removes a specified tab from the tab group.
     *
     * By default, will also grow the window by the size of the tabstrip to counter the size reduction that happens when adding a window to a tab group. This
     * can be changed by passing a value for 'bounds' - either a rectangle object, or 'null' to perform no bounds change whatsoever.
     *
     * Method will also restore any other window attributes that were modified when adding the tab to the group, such as window frame.
     *
     * Will reject if the given window doesn't exist or isn't a part of this tab group.
     *
     * @param {DesktopWindow} tab The Tab to remove.
     * @param {Bounds} bounds Can set a custom size/position for the ejected window, or disable the default size change.
     */
    public async removeTab(tab: DesktopWindow, bounds?: Rectangle|null): Promise<void> {
        const index: number = this.tabs.indexOf(tab);
        if (tab && index >= 0) {
            this._tabs.splice(index, 1);
            delete this._tabProperties[tab.getId()];

            if (this._tabs.length > 0 && this.activeTab.getId() === tab.getId()) {
                const nextTab: DesktopWindow = this._tabs[index] ? this._tabs[index] : this._tabs[index - 1];

                if (this.tabs.length === 1) {
                    this.tabs[0].applyProperties({hidden: false});
                } else {
                    await this.switchTab(nextTab);
                }
            }

            await this._removeTab(tab);
        }
    }

    /**
     * Internal method - removes a tab from the group without the related actions (update active tab, set window bounds, etc).
     *
     * TODO: Rename/clean-up.
     */
    private async _removeTab(tab: DesktopWindow): Promise<void> {
        tab.setSnapGroup(new DesktopSnapGroup());
        tab.setTabGroup(null);

        const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: tab.getIdentity()};
        this.sendTabEvent(tab, GroupEventType.LEAVE_TAB_GROUP, payload);

        if (this._tabs.length <= 1) {
            // TODO: Call removeTab on the one remaining tab?..
            await Promise.all(this._tabs.map((tab) => tab.applyProperties({hidden: false})));
            await this.removeAllTabs(false);
            await this._window.close();
            DesktopTabGroup.onDestroyed.emit(this);
        }
    }

    /**
     * Switches the active Tab in the group. Hides current active window.
     * @param {TabIdentifier} ID The ID of the tab to set as active.
     */
    public async switchTab(tab: DesktopWindow): Promise<void> {
        if (tab && tab !== this._activeTab) {
            const prevTab: DesktopWindow = this._activeTab;
            this._activeTab = tab;

            await tab.applyProperties({hidden: false});
            await tab.bringToFront();
            if (prevTab) {
                await prevTab.applyProperties({hidden: true});
            }

            await Promise.all([this.sync(), this.window!.sync(), tab.sync()]);
            const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: tab.getIdentity()};
            sendToClient({uuid: TabServiceID.UUID, name: this.ID}, 'tab-activated', payload);
        }
    }

    public async hideAllTabsMinusActiveTab() {
        return Promise.all(this.tabs.map((tab) => {
            if (tab.getId() === this.activeTab.getId()) {
                return;
            } else {
                return tab.applyProperties({hidden: true});
            }
        }));
    }

    /**
     * Removes all tabs from this tab set.
     * @param closeApps Flag if we should close the tabbed windows.
     */
    public removeAllTabs(closeApps: boolean): Promise<void> {
        const tabs: DesktopWindow[] = this._tabs.slice();
        const promises: Promise<void>[] = tabs.map(tab => this.removeTab(tab));

        if (closeApps) {
            promises.push.apply(promises, tabs.map(tab => tab.close()));
        }

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
        }) ||
            null;
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
