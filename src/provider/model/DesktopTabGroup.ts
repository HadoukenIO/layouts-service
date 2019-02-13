import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {Scope} from '../../../gen/provider/config/scope';

import {ApplicationUIConfig, TabAddedPayload, TabGroupEventPayload, TabProperties, WindowIdentity, WindowState} from '../../client/types';
import {WindowMessages} from '../APIMessages';
import {tabService} from '../main';
import {Signal1} from '../Signal';
import {Debounced} from '../snapanddock/utils/Debounced';
import {Point, PointUtils} from '../snapanddock/utils/PointUtils';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

import {DesktopEntity} from './DesktopEntity';
import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopTabstripFactory} from './DesktopTabstripFactory';
import {DesktopWindow, EntityState, eTransformType, Mask, ResizeConstraint} from './DesktopWindow';

/**
 * Handles functionality for the TabSet
 */
export class DesktopTabGroup implements DesktopEntity {
    public static readonly onCreated: Signal1<DesktopTabGroup> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopTabGroup> = new Signal1();

    /**
     * Need to lazily-initialise the window pool, due to DesktopTabstripFactory's dependency on the config store.
     */
    public static get windowPool(): DesktopTabstripFactory {
        if (!this._windowPool) {
            this._windowPool = new DesktopTabstripFactory();
        }

        return this._windowPool;
    }

    private static _windowPool: DesktopTabstripFactory;

    private _model: DesktopModel;

    /**
     * Handle to this tabgroup's window.
     */
    private _window: DesktopWindow;

    /**
     * State of all windows within the tab group.
     *
     * Updated on tab added/removed/transformed.
     */
    private _groupState: EntityState;

    /**
     * Tabs currently in this tab group.
     */
    private _tabs: DesktopWindow[];

    /**
     * The active tab in the tab group.
     */
    private _activeTab!: DesktopWindow;

    private _isMaximized: boolean;
    private _beforeMaximizeBounds: Rectangle|undefined;

    private _config: ApplicationUIConfig;

    private _validateGroup: Debounced<() => void, DesktopTabGroup, []>;

    /**
     * Constructor for the TabGroup Class.
     * @param {ApplicationUIConfig} windowOptions
     */
    constructor(model: DesktopModel, group: DesktopSnapGroup, config: ApplicationUIConfig) {
        // Fetch a window from the pool, if available. Otherwise, fetch the relevant window options and have DesktopWindow handle the window creation.
        const pool: DesktopTabstripFactory = DesktopTabGroup.windowPool;
        const windowSpec: _Window|fin.WindowOptions = pool.getNextWindow(config) || pool.generateTabStripOptions(config);

        this._model = model;
        this._window = new DesktopWindow(model, group, windowSpec);
        this._window.onModified.add((window: DesktopWindow) => this.updateBounds());
        this._window.onTransform.add((window: DesktopWindow, type: Mask<eTransformType>) => this.updateBounds());
        this._window.onCommit.add((window: DesktopWindow, type: Mask<eTransformType>) => this.updateBounds());
        this._groupState = {...this._window.currentState};
        this._window.setTabGroup(this);
        this._tabs = [];
        this._config = config;

        this._isMaximized = false;

        this._validateGroup = new Debounced(this.validateGroupInternal, this);

        DesktopTabGroup.onCreated.emit(this);
    }

    public get id(): string {
        return this._window.id;
    }

    public get identity(): WindowIdentity {
        return this._window.identity;
    }

    public get currentState(): EntityState {
        this.updateBounds();
        return this._groupState;
    }

    public get snapGroup(): DesktopSnapGroup {
        return this._window.snapGroup;
    }

    public get tabGroup(): DesktopTabGroup {
        return this;
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

    /**
     * Scope isn't really strictly defined for a tab group...
     *
     * Will assume that the tab group should follow the config rules for the active tab, in reality it should be some
     * kind of union/intersection of all of the tab properties, similar to resizeConstraints, etc.
     *
     * Config store doesn't currently support querying for a range of scopes, or "merging" config objects together.
     */
    public get scope(): Scope {
        const activeWindow = this._activeTab || this._tabs[0] || this._window;
        return activeWindow.scope;
    }

    /**
     * Returns the window state this tab group is currently mimicing. Note this may not match the internal underlying state
     * as 'maximized' tabs are not truely maximized as far as Windows is concerned
     */
    public get state(): WindowState {
        return this._window.currentState.state === 'minimized' ? 'minimized' : this._isMaximized ? 'maximized' : 'normal';
    }

    public applyOverride<K extends keyof EntityState>(property: K, value: EntityState[K]): Promise<void> {
        return this.updateWindows(window => window.applyOverride(property, value));
    }

    public resetOverride(property: keyof EntityState): Promise<void> {
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
            const {center, halfSize} = this._activeTab.currentState;
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
            if (await this.activeTab.currentState.state === 'minimized') {
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
        // Only minimize the tabstrip and active tab since minimizing hidden windows causes issues.
        // This may cause problems if switching tabs while minimized, but that would require a questionable custom tabstrip.
        await Promise.all([this._window.applyProperties({state: 'minimized'}), this.activeTab.applyProperties({state: 'minimized'})]);
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
            await this.addTabInternal(firstTab, false);
            await Promise.all([firstTab.sync(), this._window.sync()]);
            // Add the tabs one-at-a-time to avoid potential race conditions with constraints updates.
            for (const tab of tabs) {
                await this.addTabInternal(tab, !!activeTabId && activeTabId === tab.identity);
            }
        });

        if (!activeTabId) {
            // Set the desired tab as active
            await this.switchTab(activeTab);
        } else {
            // Need to re-send tab-activated event to ensure tab is active within tabstrip
            // TODO: See if this can be avoided
            const payload: TabGroupEventPayload = {tabstripIdentity: this.identity, identity: activeTab.identity};
            this._window.sendMessage('tab-activated', payload);
        }
    }

    public async swapTab(tabToRemove: DesktopWindow, tabToAdd: DesktopWindow): Promise<void> {
        const tabIndex = this._tabs.indexOf(tabToRemove!);

        if (tabIndex >= 0) {
            await this.addTabInternal(tabToAdd, false, this._tabs.indexOf(tabToRemove!) + 1);
            await this.removeTabInternal(tabToRemove, this._tabs.indexOf(tabToRemove!));

            if (this._activeTab.id === tabToRemove.id) {
                // if the switched-with tab was the active one, we make the added tab active
                this.switchTab(tabToAdd);
            } else {
                // else we hide it because the added tab might be visible.
                tabToAdd.applyProperties({hidden: true});
            }
        } else {
            throw new Error(`Cannot swap tabs - ${tabToRemove && tabToRemove.id} doesn't exist within tab set`);
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
                                                          return tab.id === refId;
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
            const existingTabs: DesktopWindow[] = this._tabs.slice();
            const existingSnappables: DesktopEntity[] = this.snapGroup.entities;

            // Remove tab
            promises.push(this.removeTabInternal(tab, index));

            // Update tab window
            if (tab.isReady) {
                const {frame, resizeConstraints} = tab.applicationState;

                if (bounds) {
                    // Eject tab, apply custom bounds, and reset resizeConstraints to their original value
                    promises.push(tab.applyProperties({hidden: false, frame, resizeConstraints, ...bounds}));
                } else if (bounds === null) {
                    // Eject tab without modifying window bounds and reset resizeConstraints to their original value
                    promises.push(tab.applyProperties({hidden: false, frame, resizeConstraints}));
                } else {
                    const tabStripHalfSize: Point = this._window.currentState.halfSize;
                    const state: EntityState = tab.currentState;
                    const center: Point = {x: state.center.x, y: state.center.y - tabStripHalfSize.y};
                    const halfSize: Point = {x: state.halfSize.x, y: state.halfSize.y + tabStripHalfSize.y};

                    // Eject tab, apply default bounds, and reset resizeConstraint to their original value
                    promises.push(tab.applyProperties({hidden: false, frame, resizeConstraints, center, halfSize}));
                }
            }

            // Activate next tab
            if (this._tabs.length >= 2 && this.activeTab.id === tab.id) {
                const nextTab: DesktopWindow = this._tabs[index] ? this._tabs[index] : this._tabs[index - 1];
                promises.push(this.switchTab(nextTab));
            }

            await Promise.all(promises);

            // If removing the tab caused tab group to disband, re-attach remaining tab to any previously-snapped windows
            if (existingTabs.length === 2 && existingSnappables.length > 1) {
                const joinedSnappable = existingSnappables[0] === this ? existingSnappables[1] : existingSnappables[0];
                const remainingTab = existingTabs[0] === tab ? existingTabs[1] : existingTabs[0];

                // Add a small delay before regrouping the remaining window.
                // This will push the current execution context to the end of the stack
                // and ensure that the 'leave' event for the window has been fully
                // processed before regrouping.
                // As of v38 the ordering of the event processing changed causing
                // some very annoying race conditions and leaving the window ungrouped from
                // the other snapped windows.
                // TODO (SERVICE-311): Investigate how to properly harden against these issues
                await new Promise(res => setTimeout(res, 10));
                console.log('Re-attaching remaining tab: ' + remainingTab.id + ' => ' + joinedSnappable.id);
                await remainingTab.setSnapGroup(joinedSnappable.snapGroup);
            }
        }
    }

    /**
     * Switches the active Tab in the group. Hides current active window.
     * @param {WindowIdentity} ID The ID of the tab to set as active.
     */
    public async switchTab(tab: DesktopWindow): Promise<void> {
        if (tab && tab !== this._activeTab) {
            const prevTab: DesktopWindow = this._activeTab;
            const focus = this._tabs.indexOf(this._activeTab) >= 0 || (!!this._activeTab && !this._activeTab.isReady);
            this._activeTab = tab;

            await tab.applyProperties({hidden: false});

            if (focus) {
                await tab.setAsForeground();
            }

            if (prevTab && prevTab.tabGroup === this) {
                await prevTab.applyProperties({hidden: true});
            }

            await Promise.all([this._window.sync(), tab.sync()]).catch(e => console.error(e));
            const payload: TabGroupEventPayload = {tabstripIdentity: this.identity, identity: tab.identity};
            this._window.sendMessage('tab-activated', payload);
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

    public validate(): void {
        this._validateGroup.call();
    }

    private updateBounds(): void {
        const activeTab = this.activeTab;
        if (!activeTab) {
            console.warn(`No tabs for group ${this.id}`, new Error());
            return;
        }
        const state: EntityState = this._groupState;
        const tabState = activeTab.currentState;
        const tabstripState = this._window.currentState;

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
        const existingGroup: DesktopTabGroup|null = tab.tabGroup;
        if (existingGroup === this) {
            // Nothing to do
            return;
        } else if (existingGroup) {
            console.info('Existing tab attempting to be added. Removing tab from previous group...');
            remove = existingGroup.removeTab(tab);
        }

        // Add tab
        const tabProps = tabService.getTabProperties(tab);
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
            const tabState: EntityState = tab.currentState;

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
            const existingTabState: EntityState = this._activeTab && this._activeTab.currentState || this._tabs[0].currentState;
            const {center, halfSize} = existingTabState;

            // Align tab with existing tab
            await tab.applyProperties({center, halfSize, frame: false});
        }

        await tab.setTabGroup(this);
        tab.setSnapGroup(this._window.snapGroup);


        const payload: TabAddedPayload = {tabstripIdentity: this.identity, identity: tab.identity, properties: tabProps, index: this._tabs.indexOf(tab)};
        this.sendTabEvent(tab, 'tab-added', payload);

        if (!setActive) {
            await tab.applyProperties({hidden: true});
        }

        if (setActive) {
            await this.switchTab(tab);
        }

        await Promise.all([tab.sync(), this._window.sync()]);

        await this.updateGroupConstraints();
    }

    private async removeTabInternal(tab: DesktopWindow, index: number): Promise<void> {
        this._tabs.splice(index, 1);

        tab.onTeardown.remove(this.onWindowTeardown, this);
        tab.onTransform.remove(this.onTabTransform, this);
        if (tab.isReady) {
            // Remove tab from group by undocking and removing tab strip.
            // NOTE: Must remove from tab group first, to ensure snap group treats 'tab' as a single window, and not as part of a tab group.
            const untab: Promise<void> = tab.setTabGroup(null);
            const undock: Promise<void> = tab.setSnapGroup(new DesktopSnapGroup());
            await Promise.all([untab, undock]);
        } else {
            // Window is being destroyed. Remove from tabstrip, but undock will happen as part of window destruction.
            await tab.setTabGroup(null);
        }

        await this.updateGroupConstraints();

        const payload: TabGroupEventPayload = {tabstripIdentity: this.identity, identity: tab.identity};
        await this.sendTabEvent(tab, 'tab-removed', payload);

        if (this._tabs.length < 2) {
            if (this._window.isReady) {
                // Note: Sensitive order of operations, change with caution.
                const closePromise = this._window.close();
                const removeTabPromises = this._tabs.map(async (tab) => {
                    // We don't receive bounds updates when windows are hidden, so cached position of inactive tabs are likely to be incorrect.
                    // Update cached position before removing tab, so that we can correctly resize the window to re-add the tabstrip height onto the window.
                    await tab.refresh();
                    await this.removeTab(tab);
                });
                await Promise.all(removeTabPromises.concat(closePromise));
            }

            this._window.setTabGroup(null);
            DesktopTabGroup.onDestroyed.emit(this);
        }
    }

    private async onWindowTeardown(window: DesktopWindow): Promise<void> {
        if (this._tabs.indexOf(window) >= 0) {
            if (window.isReady) {
                // Window is still "ready", so we should restore it to its previous size as part of the removal
                await this.removeTab(window);
            } else {
                // Since window is in the process of closing, don't attempt to reset its size
                await this.removeTab(window, null);
            }
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

    private async updateGroupConstraints(): Promise<void> {
        const result: Point<ResizeConstraint> = {
            x: {minSize: 0, maxSize: Number.MAX_SAFE_INTEGER, resizableMin: true, resizableMax: true},
            y: {minSize: 0, maxSize: Number.MAX_SAFE_INTEGER, resizableMin: true, resizableMax: true}
        };

        for (const tab of this.tabs) {
            let orientation: keyof typeof result;
            for (orientation in result) {
                if (result.hasOwnProperty(orientation)) {
                    const tabConstraints = tab.applicationState.resizeConstraints[orientation];
                    result[orientation] = {
                        minSize: Math.max(result[orientation].minSize, tabConstraints.minSize),
                        maxSize: Math.min(result[orientation].maxSize, tabConstraints.maxSize),
                        resizableMin: result[orientation].resizableMin && tabConstraints.resizableMin,
                        resizableMax: result[orientation].resizableMax && tabConstraints.resizableMax
                    };
                }
            }
        }

        this.currentState.resizeConstraints = result;

        // Apply the new constraints to all windows
        await Promise.all(this.tabs.map((tab: DesktopWindow) => tab.applyProperties({resizeConstraints: this.currentState.resizeConstraints})));
        // Update the tabStrip constraints accordingly
        if (this._window.isReady) {
            await this._window.applyProperties({
                resizeConstraints: {
                    x: result.x,
                    y: {
                        minSize: this._config.height,
                        maxSize: this._config.height,
                        resizableMin: false,
                        resizableMax: false,
                    }
                }
            });
        }
    }

    // Will check that all of the tabs and the tabstrip are still in the correct relative positions, and if not
    // moves them so that they are
    private async validateGroupInternal() {
        const tabStripOffset: Point<number> = PointUtils.difference(
            this._window.currentState.center,
            {x: this.currentState.center.x, y: this.currentState.center.y - this.currentState.halfSize.y + this.config.height / 2});

        if (PointUtils.lengthSquared(tabStripOffset) > 0) {
            console.log('TabGroup disjointed. Moving tabstrip back to group.', this.id);
            await DesktopWindow.transaction([this._window], async (wins: DesktopWindow[]) => {
                await wins[0].applyOffset(tabStripOffset);
            });
        }
    }
}
