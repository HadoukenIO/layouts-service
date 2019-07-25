import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {Signal} from 'openfin-service-signal';

import {Scope} from '../../../gen/provider/config/layouts-config';
import {LayoutsEvent} from '../../client/connection';
import {ApplicationUIConfig, TabActivatedEvent, TabAddedEvent, TabRemovedEvent} from '../../client/tabbing';
import {TabGroupMaximizedEvent, TabGroupMinimizedEvent, TabGroupRestoredEvent} from '../../client/tabstrip';
import {TabGroupDimensions, WindowState} from '../../client/workspaces';
import {tabService} from '../main';
import {Debounced} from '../snapanddock/utils/Debounced';
import {Point} from '../snapanddock/utils/PointUtils';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

import {DesktopEntity} from './DesktopEntity';
import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopTabstripFactory} from './DesktopTabstripFactory';
import {DesktopWindow, EntityState, eTransformType, Mask, ResizeConstraint, WindowIdentity} from './DesktopWindow';

/**
 * Handles functionality for the TabSet
 */
export class DesktopTabGroup implements DesktopEntity {
    public static readonly onCreated: Signal<[DesktopTabGroup]> = new Signal()
    public static readonly onDestroyed: Signal<[DesktopTabGroup]> = new Signal();

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
    private _activeTab: DesktopWindow|null;

    private _isMaximized: boolean;
    private _beforeMaximizeBounds: Rectangle|undefined;

    private _config: ApplicationUIConfig;

    private _validateGroup: Debounced<() => void, DesktopTabGroup, []>;

    private _closingOnTabRemoval: boolean;

    /**
     * Constructor for the TabGroup Class.
     * @param {ApplicationUIConfig} windowOptions
     */
    constructor(model: DesktopModel, group: DesktopSnapGroup, config: ApplicationUIConfig) {
        // Fetch a window from the pool, if available. Otherwise, fetch the relevant window options and have DesktopWindow handle the window creation.
        const pool: DesktopTabstripFactory = DesktopTabGroup.windowPool;
        const windowSpec: _Window|fin.WindowOptions = pool.getNextWindow(config) || pool.generateTabStripOptions(config);

        this._model = model;
        this._activeTab = null;
        this._window = new DesktopWindow(model, windowSpec);
        this._window.onModified.add((window: DesktopWindow) => this.updateBounds());
        this._window.onTransform.add((window: DesktopWindow, type: Mask<eTransformType>) => this.updateBounds());
        this._window.onCommit.add((window: DesktopWindow, type: Mask<eTransformType>) => this.updateBounds());
        this._window.onTeardown.add((window: DesktopWindow) => this.onTabGroupTeardown());
        this._groupState = {...this._window.currentState};

        this._tabs = [];
        this._config = config;

        this._window.setTabGroup(this);
        this._window.setSnapGroup(group);

        this._isMaximized = false;

        this._validateGroup = new Debounced(this.validateGroupInternal, this);
        this._closingOnTabRemoval = false;

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
     * Returns the window state this tab group is currently mimicking. Note this may not match the internal underlying
     * state as 'maximized' tabs are not truly maximized as far as Windows is concerned.
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

        const activeTabHalfSize: Point|undefined = halfSize && {x: halfSize.x, y: halfSize.y - tabstripHalfHeight};

        if (this._model.displayScaling) {
            const tabstripHalfSize: Point|undefined = halfSize && {x: halfSize.x, y: tabstripHalfHeight};

            /**
             * We can't depend on the tabstrip having the appropriate resize constraints at this point, due to a race condition with our
             * mitigations for display scaling issues in DesktopSnapGroup, so we manually move both the active tab, and the tabstrip itself,
             * rather than taking the earlier approach of just moving the active tab and relying on grouping and resize constraints to make
             * everything work as expected. We particularly run into this race condition when snapping a tabgroup to another window
             */
            return DesktopWindow.transaction([this._window, ...this.tabs], async (windows) => {
                await this._window.applyOffset(offset, tabstripHalfSize);

                for (const tab of this.tabs) {
                    await tab.applyOffset(offset, activeTabHalfSize);
                }
            });
        } else {
            return this.activeTab.applyOffset(offset, activeTabHalfSize);
        }
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
        if (!this.currentState.maximizable) {
            const nonMaximizableWindows: string[] = this._tabs.filter(tab => !tab.applicationState.maximizable).map(tab => tab.id);
            const sizeConstrainedWindows: string[] =
                this._tabs
                    .filter(tab => {
                        const constraints: Point<ResizeConstraint> = tab.applicationState.resizeConstraints;
                        return constraints.x.maxSize < Number.MAX_SAFE_INTEGER || constraints.y.maxSize < Number.MAX_SAFE_INTEGER;
                    })
                    .map(tab => tab.id);

            if (nonMaximizableWindows.length > 0) {
                throw new Error(`Unable to maximize tabGroup: The following tabs are not resizable: [${nonMaximizableWindows.join(', ')}]`);
            } else if (sizeConstrainedWindows.length > 0) {
                throw new Error(`Unable to maximize tabGroup: The following tabs have maximum size constraints: [${sizeConstrainedWindows.join(', ')}]`);
            } else {
                throw new Error('Unable to maximize tabGroup: Group is not maximizable');
            }
        }

        if (!this._isMaximized) {
            // Before doing anything else we will undock the tabGroup (mitigation for SERVICE-314)
            if (this.snapGroup.isNonTrivial()) {
                await this.setSnapGroup(new DesktopSnapGroup());
            }

            const {center, halfSize} = this._activeTab && this._activeTab.currentState || this._tabs[0].currentState;

            this._beforeMaximizeBounds = {center: {...center}, halfSize: {...halfSize}};

            const currentMonitor = this._model.getMonitorByRect(this._groupState) || this._model.monitors[0];

            await this._window.applyProperties({
                center: {
                    x: currentMonitor.center.x,
                    y: this._config.height / 2
                },
                halfSize: {
                    x: currentMonitor.halfSize.x,
                    y: this._config.height / 2
                }});
            await this.activeTab.applyProperties({
                center: {x: currentMonitor.center.x, y: currentMonitor.center.y + this._config.height / 2},
                halfSize: {x: currentMonitor.halfSize.x, y: currentMonitor.halfSize.y - this._config.height / 2}
            });

            this._isMaximized = true;

            const event: TabGroupMaximizedEvent = {identity: this.window.identity, type: 'tab-group-maximized'};
            this.window.sendEvent(event);
        }
    }

    /**
     * Restores the tab set window.  If the tab set window is in a maximized state we will restore the window to its "before maximized" bounds.
     */
    public async restore(): Promise<void> {
        if (this.state === 'minimized') {
            const result = this.window.applyProperties({state: 'normal'});

            const event: TabGroupRestoredEvent = {identity: this.window.identity, type: 'tab-group-restored'};
            this.window.sendEvent(event);

            return result;
        } else {
            if (this._isMaximized) {
                if (this.activeTab.currentState.state === 'minimized') {
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

            const event: TabGroupRestoredEvent = {identity: this.window.identity, type: 'tab-group-restored'};
            this.window.sendEvent(event);
        }
    }

    /**
     * Minimizes the tab set window and all tab windows.
     */
    public async minimize(): Promise<void> {
        // Only minimize the tabstrip and active tab since minimizing hidden windows causes issues.
        // This may cause problems if switching tabs while minimized, but that would require a questionable custom tabstrip.
        await Promise.all([this._window.applyProperties({state: 'minimized'}), this.activeTab.applyProperties({state: 'minimized'})]);

        const event: TabGroupMinimizedEvent = {identity: this.window.identity, type: 'tab-group-minimized'};
        this.window.sendEvent(event);
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

        // If we're forming this tabgroup from a maximized tab, we'll want to maximize this tabgroup, and inherit the tab window's restore bounds
        let beforeMaximizeBounds: Rectangle|undefined;
        if (this.tabs.length === 0 && firstTab.currentState.state === 'maximized') {
            const tabBounds = firstTab.beforeMaximizeBounds;

            const center = {x: tabBounds.center.x, y: tabBounds.center.y + (this._config.height / 2)};
            const halfSize = {x: tabBounds.halfSize.x, y: tabBounds.halfSize.y - this._config.height / 2};

            beforeMaximizeBounds = {center, halfSize};
        }

        await DesktopWindow.transaction(allWindows, async () => {
            await this.addTabInternal(firstTab, false);
            await Promise.all([firstTab.sync(), this._window.sync()]);
            // Add the tabs one-at-a-time to avoid potential race conditions with constraints updates.
            for (const tab of tabs) {
                await this.addTabInternal(tab, activeTab === tab);
            }
        });

        await this.switchTab(activeTab);

        if (beforeMaximizeBounds) {
            await this.maximize().then(() => {
                this._beforeMaximizeBounds = beforeMaximizeBounds;
            }, () => {});
        }
    }

    public async swapTab(tabToRemove: DesktopWindow, tabToAdd: DesktopWindow): Promise<void> {
        const tabIndex = this._tabs.indexOf(tabToRemove!);
        if (tabIndex >= 0) {
            await this.addTabInternal(tabToAdd, false, this._tabs.indexOf(tabToRemove!) + 1);
            await this.removeTabInternal(tabToRemove, this._tabs.indexOf(tabToRemove!));

            if (this._activeTab && this._activeTab.id === tabToRemove.id) {
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
    public reorderTabArray(orderReference: WindowIdentity[]): void {
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
                if (remainingTab.isReady) {
                    console.log('Re-attaching remaining tab: ' + remainingTab.id + ' => ' + joinedSnappable.id);
                    await remainingTab.setSnapGroup(joinedSnappable.snapGroup);
                }
            }
        }
    }

    /**
     * Switches the active Tab in the group. Hides current active window.
     * @param {WindowIdentity} ID The ID of the tab to set as active.
     */
    public async switchTab(tab: DesktopWindow): Promise<void> {
        if (tab && tab !== this._activeTab) {
            const prevTab: DesktopWindow|null = this._activeTab;

            /**
             * Focus the window in the tabstrip.  Should be falsy in cases of a window being ejected.
             */
            const focus = this._activeTab && (this._tabs.indexOf(this._activeTab) >= 0 || !this._activeTab.isReady);

            this._activeTab = tab;

            const tabState = this.state === 'minimized' ? 'minimized' : 'normal';

            await tab.applyProperties({hidden: false, state: tabState});

            // Fixes flicker on tab switch caused by next window and previous window not showing or hiding before resolving its promise.
            await new Promise(res => setTimeout(res, 75));

            if (focus) {
                await tab.setAsForeground();
            }

            if (prevTab && prevTab.tabGroup === this) {
                await prevTab.applyProperties({hidden: true, state: 'normal'});
            }

            await Promise.all([this._window!.sync(), tab.sync()]).catch(e => console.error(e));
            const event: TabActivatedEvent = {tabstripIdentity: this.identity, identity: tab.identity, type: 'tab-activated'};
            this._window.sendEvent(event);
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

    public getSaveDimensions(): TabGroupDimensions {
        if (this._isMaximized && this._beforeMaximizeBounds) {
            const bounds: Rectangle = this._beforeMaximizeBounds;

            return {
                x: bounds.center.x - bounds.halfSize.x,
                y: (bounds.center.y - bounds.halfSize.y) - (this._config.height),
                width: bounds.halfSize.x * 2,
                appHeight: bounds.halfSize.y * 2
            };
        } else {
            const appRect: Rectangle = this.activeTab.currentState;
            const groupRect: Rectangle = this.window.currentState;

            return {
                x: groupRect.center.x - groupRect.halfSize.x,
                y: groupRect.center.y - groupRect.halfSize.y,
                width: groupRect.halfSize.x * 2,
                appHeight: appRect.halfSize.y * 2
            };
        }
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
        this._tabs.splice(index, 0, tab);
        tab.onTeardown.add(this.onWindowTeardown, this);
        tab.onTransform.add(this.onTabTransform, this);

        // Sync all windows
        if (remove) {
            await Promise.all([this._window.sync(), tab.sync(), remove]);
        } else {
            await Promise.all([this._window.sync(), tab.sync()]);
        }

        // Remove tab from snap group before we position it, so as to not indirectly move anything else
        if (tab.snapGroup.isNonTrivial()) {
            await tab.setSnapGroup(new DesktopSnapGroup());
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
            // Delay to allow other async operations to jump ahead in the queue. Specifically, any pending boundsChanging events
            // should be processed before continuing.
            await new Promise(res => setTimeout(res, 10));
            // If the target window/group is in the process of being moved, we delay the rest of the operation until we receive
            // a bounds changed and update the currentState. This should serve as a fix/mitigation for SERVICE-360.
            if (this._window.moveInProgress) {
                await new Promise(async res => {
                    const slot = this._window.onCommit.add(async (win, type) => {
                        slot.remove();
                        res();
                    });
                });
            }
            const existingTabState: EntityState = this._activeTab && this._activeTab.currentState || this._tabs[0].currentState;
            const {center, halfSize} = existingTabState;

            // Align tab with existing tab
            await tab.applyProperties({center, halfSize, frame: false});
        }

        await tab.setTabGroup(this);
        await tab.setSnapGroup(this._window.snapGroup);

        const tabProps = tabService.getTabProperties(tab);
        const event:
            TabAddedEvent = {tabstripIdentity: this.identity, identity: tab.identity, properties: tabProps, index: this._tabs.indexOf(tab), type: 'tab-added'};
        this.sendTabEvent(tab, event);

        if (!setActive) {
            await tab.applyProperties({hidden: true});
        } else {
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

        const payload: TabRemovedEvent = {tabstripIdentity: this.identity, identity: tab.identity, type: 'tab-removed'};
        await this.sendTabEvent(tab, payload);

        if (this._tabs.length < 2) {
            if (this._window.isReady) {
                // Note: Sensitive order of operations, change with caution.
                this._closingOnTabRemoval = true;
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

    private async onTabGroupTeardown(): Promise<void> {
        if (!this._closingOnTabRemoval) {
            return this.removeAllTabs(true);
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

    private async sendTabEvent(tab: DesktopWindow, event: LayoutsEvent): Promise<void> {
        await Promise.all([
            // Send event to application
            tab.sendEvent(event),

            // Send event to tabstrip
            this._window.sendEvent(event)
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

        // Update the internal state of the tabGroup
        this.currentState.resizeConstraints = {x: {...result.x}, y: {...result.y}};
        // Update the tabStrip constraints accordingly
        if (this._window.isReady) {
            await this._window.applyProperties({
                resizeConstraints: {
                    x: result.x,
                    y: {
                        minSize: this._config.height,
                        maxSize: this._config.height,
                        resizableMin: result.y.resizableMin,
                        resizableMax: false
                    }
                }
            });
        }

        result.y.resizableMin = false;  // Cannot resize on the edge between tab and tabstrip (SERVICE-287)
        // Apply the new constraints to all windows
        await Promise.all(this.tabs.map((tab: DesktopWindow) => tab.applyProperties({resizeConstraints: result})));

        // Changes to constraints also affect the maximizability of the tabgroup, so we update that here too
        this._groupState.maximizable = this._tabs.every(tab => tab.applicationState.maximizable) &&        // All tabs must be maximizable
            result.x.maxSize === Number.MAX_SAFE_INTEGER && result.y.maxSize === Number.MAX_SAFE_INTEGER;  // No tabs have maxSize constraints
    }

    // Will check that all of the tabs and the tabstrip are still in the correct relative positions, and if not
    // moves them so that they are
    private async validateGroupInternal() {
        const expectedTabstripPosition = {
            center: {
                x: this.activeTab.currentState.center.x,
                y: this.activeTab.currentState.center.y - this.activeTab.currentState.halfSize.y - this.config.height / 2
            },
            halfSize: {x: this.activeTab.currentState.halfSize.x, y: this._config.height / 2}
        };

        if (!RectUtils.isEqual(expectedTabstripPosition, this._window.currentState)) {
            console.log('TabGroup disjointed. Moving tabstrip back to group.', this.id);
            await DesktopWindow.transaction([this._window], async (wins: DesktopWindow[]) => {
                await wins[0].applyProperties(expectedTabstripPosition);
            });
        }
    }
}
