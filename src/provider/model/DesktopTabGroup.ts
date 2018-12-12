import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {JoinTabGroupPayload, TabGroupEventPayload, TabPropertiesUpdatedPayload} from '../../client/tabbing';
import {ApplicationUIConfig, TabProperties, WindowIdentity} from '../../client/types';
import {Signal1} from '../Signal';
import {Point, PointUtils} from '../snapanddock/utils/PointUtils';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup, Snappable} from './DesktopSnapGroup';
import {DesktopTabstripFactory} from './DesktopTabstripFactory';
import {DesktopWindow, eTransformType, Mask, WindowMessages, WindowState} from './DesktopWindow';

/**
 * Handles functionality for the TabSet
 */
export class DesktopTabGroup implements Snappable {
    public static readonly onCreated: Signal1<DesktopTabGroup> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopTabGroup> = new Signal1();

    private static _windowPool: DesktopTabstripFactory = new DesktopTabstripFactory();

    /**
     * The ID for the TabGroup.
     */
    public readonly ID: string;

    private _model: DesktopModel;

    /**
     * Handle to this tabgroups window.
     */
    private _window: DesktopWindow;

    /**
     * State of all windows within the tab group.
     *
     * Updated on tab added/removed/transformed.
     */
    private _windowState: WindowState;

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

    private _isMaximized: boolean;
    private _beforeMaximizeBounds: Rectangle|undefined;

    private _config: ApplicationUIConfig;


    /**
     * Constructor for the TabGroup Class.
     * @param {ApplicationUIConfig} windowOptions
     */
    constructor(model: DesktopModel, group: DesktopSnapGroup, config: ApplicationUIConfig) {
        // Fetch a window from the pool, if available. Otherwise, fetch the relevant window options and have DesktopWindow handle the window creation.
        const windowSpec: _Window|fin.WindowOptions =
            DesktopTabGroup._windowPool.getNextWindow(config) || DesktopTabstripFactory.generateTabStripOptions(config);

        this._model = model;
        this._window = new DesktopWindow(model, group, windowSpec);
        this._window.onModified.add((window: DesktopWindow) => this.updateBounds());
        this._window.onTransform.add((window: DesktopWindow, type: Mask<eTransformType>) => this.updateBounds());
        this._window.onCommit.add((window: DesktopWindow, type: Mask<eTransformType>) => this.updateBounds());
        this._windowState = {...this._window.getState()};
        this.ID = this._window.getIdentity().name;
        this._window.setTabGroup(this);
        this._tabs = [];
        this._tabProperties = {};
        this._config = config;

        this._isMaximized = false;

        DesktopTabGroup.onCreated.emit(this);
    }

    public get config(): ApplicationUIConfig {
        return this._config;
    }

    /**
     * Returns the current active tab of the tab set.
     * @returns The Active Tab
     */
    public get activeTab(): DesktopWindow {
        return this._activeTab || this._tabs[0];
    }

    /**
     * Returns the tab sets window.
     * @returns The group window.
     */
    public get window(): DesktopWindow {
        return this._window;
    }

    /**
     * Returns the tabs of this tab set.
     * @returns Array of tabs.
     */
    public get tabs(): ReadonlyArray<DesktopWindow> {
        return this._tabs;
    }

    public get isMaximized(): boolean {
        return this._isMaximized;
    }

    public getId(): string {
        return this._window.getId();
    }

    public getIdentity(): WindowIdentity {
        return this._window.getIdentity();
    }

    public getState(): WindowState {
        this.updateBounds();
        return this._windowState;
    }

    public getSnapGroup(): DesktopSnapGroup {
        return this._window.getSnapGroup();
    }

    public getTabGroup(): DesktopTabGroup {
        return this;
    }

    public applyOverride<K extends keyof WindowState>(property: K, value: WindowState[K]): Promise<void> {
        return this.updateWindows(window => window.applyOverride(property, value));
    }

    public resetOverride(property: keyof WindowState): Promise<void> {
        return this.updateWindows(window => window.resetOverride(property));
    }

    public async setSnapGroup(group: DesktopSnapGroup): Promise<void> {
        const windows = this._tabs.concat(this._window);

        return Promise
            .all(windows.map((window: DesktopWindow) => {
                return window.setSnapGroup(group);
            }))
            .then(() => {});
    }

    public async applyOffset(offset: Point, halfSize?: Point): Promise<void> {
        const tabstripHalfHeight: number = this._config.height / 2;
        const adjustedHalfSize: Point|undefined = halfSize && {x: halfSize.x, y: halfSize.y - tabstripHalfHeight};
        return this.activeTab.applyOffset(offset, adjustedHalfSize);
    }

    public updateTabProperties(tab: DesktopWindow, properties: Partial<TabProperties>): void {
        const tabProps: TabProperties = this._tabProperties[tab.getId()];
        Object.assign(tabProps, properties);
        localStorage.setItem(tab.getId(), JSON.stringify(tabProps));

        const payload: TabPropertiesUpdatedPayload = {tabGroupId: this.ID, tabID: tab.getIdentity(), properties: tabProps};
        this.sendTabEvent(tab, WindowMessages.TAB_PROPERTIES_UPDATED, payload);
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

            await this._window.applyProperties(
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
    public async restore(): Promise<void> {
        if (this._isMaximized) {
            if (await this.activeTab.getState().state === 'minimized') {
                await Promise.all(this._tabs.map(tab => tab.applyProperties({state: 'normal'})));
            } else if (this._beforeMaximizeBounds) {
                this._isMaximized = false;

                const bounds: Rectangle = this._beforeMaximizeBounds;
                await this._window.applyProperties({
                    center: {x: bounds.center.x, y: bounds.center.y - bounds.halfSize.y - (this._config.height / 2)},
                    halfSize: {x: bounds.halfSize.x, y: this._config.height / 2}
                });
                await this.activeTab.applyProperties(bounds);
            }
        } else {
            await Promise.all(this._tabs.map(tab => tab.applyProperties({state: 'normal'})));
        }
    }

    /**
     * Minimizes the tab set window and all tab windows.
     */
    public async minimize(): Promise<void> {
        const minWins = this._tabs.map(tab => {
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

    public async addTab(tab: DesktopWindow): Promise<void> {
        await this.addTabInternal(tab, true);
    }

    public async addTabAt(tab: DesktopWindow, index: number): Promise<void> {
        await this.addTabInternal(tab, true, index);
    }

    public async addTabs(tabs: DesktopWindow[], activeTabId?: WindowIdentity): Promise<void> {
        const allWindows: DesktopWindow[] = tabs.concat(this._window);
        const firstTab: DesktopWindow = tabs.shift()!;
        const activeTab: DesktopWindow = (activeTabId && this._model.getWindow(activeTabId)) || firstTab;

        await DesktopWindow.transaction(allWindows, async () => {
            await this.addTabInternal(firstTab, true);
            await Promise.all([firstTab.sync(), this._window.sync()]);
            await Promise.all(tabs.map(tab => this.addTabInternal(tab, false)));
        });

        if (activeTab !== firstTab) {
            // Set the desired tab as active
            await this.switchTab(activeTab);
        } else {
            // Need to re-send tab-activated event to ensure tab is active within tabstrip
            // TODO: See if this can be avoided
            const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: activeTab.getIdentity()};
            this._window.sendMessage(WindowMessages.TAB_ACTIVATED, payload);
        }
    }

    public async swapTab(tabToRemove: DesktopWindow, tabToAdd: DesktopWindow): Promise<void> {
        const tabIndex = this._tabs.indexOf(tabToRemove!);

        if (tabIndex >= 0) {
            await this.addTabInternal(tabToAdd, false, this._tabs.indexOf(tabToRemove!) + 1);
            await this.removeTabInternal(tabToRemove, this._tabs.indexOf(tabToRemove!));

            if (this._activeTab.getId() === tabToRemove.getId()) {
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

    /**
     * Reorders the tab structure to match what is present in the UI.
     * @param {WindowIdentity[]} orderReference The order which we should rearrange our tabs to match.  This will come from the UI component.
     */
    public reOrderTabArray(orderReference: WindowIdentity[]): void {
        const newlyOrdered: DesktopWindow[] = orderReference
                                                  .map((ref: WindowIdentity) => {
                                                      // Look-up each given identity within list of tabs
                                                      const refId = this._model.getId(ref);
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
        } else {
            throw new Error('Input array must reference each tab exactly once');
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
     * @param tab The Tab to remove.
     * @param bounds Can set a custom size/position for the ejected window, or disable the default size change.
     */
    public async removeTab(tab: DesktopWindow, bounds?: Rectangle|null): Promise<void> {
        const index: number = this._tabs.indexOf(tab);
        if (tab && index >= 0) {
            const promises: Promise<void>[] = [];

            // Remove tab
            promises.push(this.removeTabInternal(tab, index));

            // Update tab window
            if (tab.isReady()) {
                const frame: boolean = tab.getApplicationState().frame;

                if (bounds) {
                    // Eject tab and apply custom bounds
                    promises.push(tab.applyProperties({hidden: false, frame, ...bounds}));
                } else if (bounds === null) {
                    // Eject tab without modifying window bounds
                    promises.push(tab.applyProperties({hidden: false, frame}));
                } else {
                    const tabStripHalfSize: Point = this._window.getState().halfSize;
                    const state: WindowState = tab.getState();
                    const center: Point = {x: state.center.x, y: state.center.y - tabStripHalfSize.y};
                    const halfSize: Point = {x: state.halfSize.x, y: state.halfSize.y + tabStripHalfSize.y};

                    // Eject tab and apply default bounds
                    promises.push(tab.applyProperties({hidden: false, frame, center, halfSize}));
                }
            }

            // Activate next tab
            if (this._tabs.length >= 2 && this.activeTab.getId() === tab.getId()) {
                const nextTab: DesktopWindow = this._tabs[index] ? this._tabs[index] : this._tabs[index - 1];

                promises.push(this.switchTab(nextTab));
            }

            await Promise.all(promises);
        }
    }

    /**
     * Switches the active Tab in the group. Hides current active window.
     * @param {WindowIdentity} ID The ID of the tab to set as active.
     */
    public async switchTab(tab: DesktopWindow): Promise<void> {
        if (tab && tab !== this._activeTab) {
            const prevTab: DesktopWindow = this._activeTab;
            const redrawRequired: boolean = prevTab && !RectUtils.isEqual(tab.getState(), this._activeTab.getState());
            this._activeTab = tab;

            if (redrawRequired) {
                // Allow tab time to redraw before being shown to user
                await prevTab.bringToFront();
                await tab.applyProperties({hidden: false});
                await new Promise<void>(r => setTimeout(r, 150));
                await tab.bringToFront();
            } else {
                // Show tab as quickly as possible
                await tab.applyProperties({hidden: false});
                await tab.bringToFront();
            }
            if (prevTab && prevTab.getTabGroup() === this) {
                await prevTab.applyProperties({hidden: true});
            }

            await Promise.all([this._window!.sync(), tab.sync()]).catch(e => console.error(e));
            const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: tab.getIdentity()};
            this._window.sendMessage(WindowMessages.TAB_ACTIVATED, payload);
        }
    }

    /**
     * Removes all tabs from this tab set.
     * @param closeApps Flag if we should close the tabbed windows.
     */
    public removeAllTabs(closeApps: boolean): Promise<void> {
        const tabs: DesktopWindow[] = this._tabs.slice();
        let promises: Promise<void>[];

        if (closeApps) {
            promises = tabs.map(tab => tab.close());
        } else {
            promises = tabs.map(tab => this.removeTab(tab));
        }

        return Promise.all(promises).then(() => {});
    }

    private updateBounds(): void {
        const activeTab = this.activeTab;
        if (!activeTab) {
            console.warn(`No tabs for group ${this.ID}`, new Error());
            return;
        }
        const state: WindowState = this._windowState;
        const tabState = activeTab.getState();
        const tabstripState = this._window.getState();

        state.center.x = tabstripState.center.x;
        state.halfSize.x = tabstripState.halfSize.x;
        state.center.y = tabState.center.y - tabstripState.halfSize.y;
        state.halfSize.y = tabState.halfSize.y + tabstripState.halfSize.y;
    }

    private onTabTransform(window: DesktopWindow, type: Mask<eTransformType>): void {
        this.updateBounds();
    }

    private updateWindows(action: (window: DesktopWindow) => Promise<void>): Promise<void> {
        const promises: Promise<void>[] = this._tabs.map(action);
        promises.concat(action(this._window));

        return Promise.all(promises).then(() => {});
    }

    private async addTabInternal(tab: DesktopWindow, setActive: boolean, index: number = this._tabs.length): Promise<void> {
        let remove: Promise<void>|null = null;
        const existingGroup: DesktopTabGroup|null = tab.getTabGroup();
        if (existingGroup === this) {
            // Nothing to do
            return;
        } else if (existingGroup) {
            console.info('Existing tab attempting to be added. Removing tab from previous group...');
            remove = existingGroup.removeTab(tab);
        }

        // Add tab
        this._tabProperties[tab.getId()] = this.getTabProperties(tab);
        this._tabs.splice(index, 0, tab);
        tab.onTeardown.add(this.onWindowTeardown, this);
        tab.onTransform.add(this.onTabTransform, this);

        // Sync all windows
        if (remove) {
            await Promise.all([this._window.sync(), tab.sync(), remove]);
        } else {
            await Promise.all([this._window.sync(), tab.sync()]);
        }

        // Position window
        if (this._tabs.length === 1) {
            const tabState: WindowState = tab.getState();

            // Align tabstrip to this tab
            await this._window.applyProperties({
                center: {x: tabState.center.x, y: tabState.center.y - tabState.halfSize.y + (this._config.height / 2)},
                halfSize: {x: tabState.halfSize.x, y: this._config.height / 2},
                hidden: false
            });

            // Reduce size of app window by size of tabstrip
            const center: Point = {x: tabState.center.x, y: tabState.center.y + (this._config.height / 2)};
            const halfSize: Point = {x: tabState.halfSize.x, y: tabState.halfSize.y - (this._config.height / 2)};
            await tab.applyProperties({center, halfSize, frame: false});
        } else {
            const existingTabState: WindowState = this._activeTab.getState();
            const {center, halfSize} = existingTabState;

            // Align tab with existing tab
            await tab.applyProperties({center, halfSize, frame: false});
        }

        await tab.setTabGroup(this);
        tab.setSnapGroup(this._window.getSnapGroup());

        const addTabPromise: Promise<void> = (async () => {
            const payload: JoinTabGroupPayload =
                {tabGroupId: this.ID, tabID: tab.getIdentity(), tabProps: this._tabProperties[tab.getId()], index: this._tabs.indexOf(tab)};

            this.sendTabEvent(tab, WindowMessages.JOIN_TAB_GROUP, payload);
            await tab.applyProperties({hidden: tab !== this._activeTab});
            await this._window.bringToFront();
        })();
        await addTabPromise;  // TODO: Need to add this to a pendingActions queue?

        if (setActive) {
            await this.switchTab(tab);
        }
        await Promise.all([tab.sync(), this._window.sync()]);
    }

    private async removeTabInternal(tab: DesktopWindow, index: number): Promise<void> {
        this._tabs.splice(index, 1);
        delete this._tabProperties[tab.getId()];

        tab.onTeardown.remove(this.onWindowTeardown, this);
        tab.onTransform.remove(this.onTabTransform, this);
        await Promise.all([tab.setSnapGroup(new DesktopSnapGroup()), tab.setTabGroup(null)]);

        const payload: TabGroupEventPayload = {tabGroupId: this.ID, tabID: tab.getIdentity()};
        await this.sendTabEvent(tab, WindowMessages.LEAVE_TAB_GROUP, payload);

        if (this._tabs.length < 2 && this._window.isReady()) {
            // Note: Sensitive order of operations, change with caution.
            const closePromise = this._window.close();
            const removeTabPromises = this._tabs.map(async (tab) => {
                // We don't receive bounds updates when windows are hidden, so cached position of inactive tabs are likely to be incorrect.
                // Update cached position before removing tab, so that we can correctly resize the window to re-add the tabstrip height onto the window.
                await tab.refresh();
                await this.removeTab(tab);
            });
            await Promise.all(removeTabPromises.concat(closePromise));

            DesktopTabGroup.onDestroyed.emit(this);
        }
    }

    private getTabProperties(tab: DesktopWindow): TabProperties {
        const savedProperties: string|null = localStorage.getItem(tab.getId());
        if (savedProperties) {
            return JSON.parse(savedProperties);
        }

        const {icon, title} = tab.getState();
        // Special handling for S&R placeholder windows
        const modifiedTitle = tab.getIdentity().uuid === fin.Window.me.uuid && title.startsWith('Placeholder-') ? 'Loading...' : title;
        return {icon, title: modifiedTitle};
    }

    private onWindowTeardown(window: DesktopWindow): void {
        if (this._tabs.indexOf(window) >= 0) {
            this.removeTab(window, null);
        }
    }

    private async sendTabEvent<T extends TabGroupEventPayload>(tab: DesktopWindow, event: WindowMessages, payload: T): Promise<void> {
        await Promise.all([
            // Send event to application
            tab.sendMessage(event, payload),

            // Send event to tabstrip
            this._window.sendMessage(event, payload)
        ]);
    }
}
