import deepEqual from 'fast-deep-equal';

import {Scope, Tabstrip} from '../../../gen/provider/config/layouts-config';
import {LayoutsEvent} from '../../client/connection';
import {ApplicationUIConfig, TabProperties, TabPropertiesUpdatedEvent} from '../../client/tabbing';
import {TabGroup, TabGroupDimensions} from '../../client/workspaces';
import {ConfigStore} from '../main';
import {DesktopEntity} from '../model/DesktopEntity';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopTabstripFactory} from '../model/DesktopTabstripFactory';
import {DesktopWindow, EntityState, WindowIdentity} from '../model/DesktopWindow';
import {promiseForEach} from '../snapanddock/utils/async';
import {Point, PointUtils} from '../snapanddock/utils/PointUtils';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';
import {eTargetType, TargetBase} from '../WindowHandler';

import {DragWindowManager} from './DragWindowManager';

/**
 * TabTarget constructs an interface which represents an area on a window where a tab strip will be placed.
 */
export interface TabTarget extends TargetBase {
    type: eTargetType.TAB;

    /**
     * Represents the target window tabbing space;
     */
    dropArea: Rectangle;

    /**
     * The specific window that is targeted in the target candidate group.
     */
    targetWindow: DesktopEntity;

    /**
     * Flag indicating if the target was generated by a tab being dragged (true) or window being dragged (false).
     */
    tabDragging: boolean;
}

export interface EjectTarget extends TargetBase {
    type: eTargetType.EJECT;
    position: Point;
}

/**
 * The overarching class for the Tab Service.
 */
export class TabService {
    private _model: DesktopModel;
    private _config: ConfigStore;

    /**
     * Handle to the DragWindowManager
     */
    private _dragWindowManager: DragWindowManager;

    /**
     * Constructor of the TabService Class.
     */
    constructor(model: DesktopModel, config: ConfigStore) {
        this._model = model;
        this._dragWindowManager = new DragWindowManager(model);

        this._config = config;
        this._config.add({level: 'service'}, {tabstrip: DesktopTabstripFactory.DEFAULT_CONFIG});
    }

    /**
     * Returns the DragWindowManager instance.
     */
    public get dragWindowManager(): DragWindowManager {
        return this._dragWindowManager;
    }

    /**
     * Creates a new tab group with provided tabs.  Will use the UI and position of the first Identity provided for positioning.
     * @param tabIdentities An array of Identities to add to a group.
     */
    public async createTabGroupWithTabs(tabIdentities: WindowIdentity[], activeTab?: WindowIdentity): Promise<void> {
        if (tabIdentities.length < 2) {
            console.error('createTabGroup called fewer than 2 tab identifiers');
            throw new Error('Must provide at least 2 Tab Identifiers');
        }

        // Checks duplicate entries in the provided array.
        tabIdentities.forEach(id => {
            if (tabIdentities.filter(filterId => filterId.name === id.name && filterId.uuid === filterId.uuid).length > 1) {
                throw new Error(`Duplicate identity found: ${id.uuid}/${id.name} - Provided identites must be unique.`);
            }
        });

        const tabs: DesktopWindow[] = tabIdentities
                                          .map((identity: WindowIdentity) => {
                                              return this._model.getWindow(identity);
                                          })
                                          .filter((tab: DesktopWindow|null): tab is DesktopWindow => {
                                              // Also filter-out any tabbing-disabled windows
                                              return tab !== null && this._config.query(tab.scope).features.tab;
                                          });

        if (tabs.length !== tabIdentities.length) {
            if (tabs.length < 2) {
                throw new Error(
                    'Must have at least two valid tab identities to create a tab group: ' +
                    tabIdentities.map(identity => `${identity.uuid}/${identity.name}`).join('\n'));
            } else {
                console.warn(
                    'Tab list contained ' + (tabIdentities.length - tabs.length) + ' invalid identities', tabIdentities, tabs.map(tab => tab.identity));
            }
        }

        // Compute the tabs to be ejected and manually create a new TabGroup for them
        const previousTabGroup = tabs[0].tabGroup;
        if (previousTabGroup) {
            const ejectedTabs = previousTabGroup.tabs.filter(candidateEjectedTab => !tabs.includes(candidateEjectedTab));
            await promiseForEach(ejectedTabs, async (ejectedTab) => {
                await previousTabGroup.removeTab(ejectedTab);
            });

            if (ejectedTabs.length > 1) {
                const ejectedTabstripConfig: Tabstrip = this.getTabstripConfig(ejectedTabs[0].identity);
                const ejectedTabGroup: DesktopTabGroup = new DesktopTabGroup(this._model, new DesktopSnapGroup(), ejectedTabstripConfig);
                await ejectedTabGroup.addTabs(ejectedTabs);
            } else if (ejectedTabs.length === 1) {
                ejectedTabs[0].setSnapGroup(new DesktopSnapGroup());
            }
        }

        // Used after formation to determine if group should be maximized
        const state = tabs[0].currentState;
        const beforeMaximizeBounds: Rectangle = tabs[0].beforeMaximizeBounds;

        const config: Tabstrip = this.getTabstripConfig(tabIdentities[0]);
        const snapGroup: DesktopSnapGroup = tabs[0].snapGroup.isNonTrivial() ? tabs[0].snapGroup : new DesktopSnapGroup();
        const tabGroup: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, config);
        await tabGroup.addTabs(tabs, activeTab);

        if (state.state === 'maximized') {
            tabGroup.maximize(beforeMaximizeBounds).catch(console.warn);
        }
    }

    /**
     * Removes a tab from a tab group.
     *
     * If given ID is invalid or doesn't belong to a tab set, method call has no effect.
     *
     * @param {WindowIdentity} tabID The identity of the tab to remove.
     */
    public async removeTab(tabID: WindowIdentity): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabID);
        const group: DesktopTabGroup|null = tab && tab.tabGroup;

        if (group) {
            await group.removeTab(tab!);
        }
    }

    public async swapTab(toRemove: WindowIdentity, toAdd: WindowIdentity): Promise<void> {
        const tabToAdd: DesktopWindow|null = this._model.getWindow(toAdd);
        const tabToRemove: DesktopWindow|null = this._model.getWindow(toRemove);
        const group: DesktopTabGroup|null = tabToRemove && tabToRemove.tabGroup;

        if (!tabToRemove || !group) {
            throw new Error(`No tab group found for ${toRemove.uuid} - ${toRemove.name}`);
        } else if (!tabToAdd) {
            throw new Error(`No window found for ${toAdd.uuid} - ${toAdd.name}`);
        }

        return group.swapTab(tabToRemove, tabToAdd);
    }

    /**
     * Gathers information from tab sets and their tabs, and returns as a JSON object back to the requesting application/window.
     */
    public async getTabSaveInfo(): Promise<TabGroup[]> {
        const tabGroups: ReadonlyArray<DesktopTabGroup> = this._model.tabGroups;

        return Promise.all(tabGroups.map(async (group: DesktopTabGroup) => {
            const tabs: WindowIdentity[] = group.tabs.map((tab: DesktopWindow) => {
                return tab.identity;
            });

            const config: Tabstrip|'default' =
                this.areTabstripConfigurationsCompatible(group.config, DesktopTabstripFactory.DEFAULT_CONFIG) ? 'default' : group.config;

            const groupInfo = {active: group.activeTab.identity, dimensions: group.getSaveDimensions(), config, state: group.state};

            return {tabs, groupInfo};
        }));
    }

    public async createTabGroupsFromWorkspace(groupDefs: TabGroup[]): Promise<DesktopTabGroup[]> {
        const model: DesktopModel = this._model;
        const tabGroups: DesktopTabGroup[] = [];

        if (!groupDefs) {
            console.error('Unable to create tabgroup - no blob supplied');
            throw new Error('Unable to create tabgroup - no blob supplied');
        }

        for (const groupDef of groupDefs) {
            const tabs: DesktopWindow[] = groupDef.tabs.map(tab => model.getWindow(tab)).filter((tab): tab is DesktopWindow => !!tab);
            const dimensions: TabGroupDimensions = groupDef.groupInfo.dimensions;

            if (tabs.length >= 2) {
                // Create a tabstrip window in the correct position
                const tabstripOptions: Tabstrip = DesktopTabstripFactory.convertToTabstripConfig(groupDef.groupInfo.config);

                // Each tab group will be a stand-alone snap group
                const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
                const tabGroup: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, tabstripOptions);

                // Position first tab to cover entire tab area - both tabstrip and app bounds
                // The positions of tabstrip and subsequent tabs will all be based on this
                const combinedHeight: number = tabstripOptions.height + dimensions.appHeight;
                const appBounds: Rectangle = {
                    center: {x: dimensions.x + (dimensions.width / 2), y: dimensions.y + (combinedHeight / 2)},
                    halfSize: {x: dimensions.width / 2, y: combinedHeight / 2}
                };
                await tabs[0].applyProperties(appBounds);

                // Add tabs to group
                await tabGroup.window.sync();
                await tabGroup.addTabs(tabs, groupDef.groupInfo.active);
                await tabGroup.window.sync();

                if (groupDef.groupInfo.state === 'maximized') {
                    await tabGroup.maximize().catch(console.warn);
                } else if (groupDef.groupInfo.state === 'minimized') {
                    await tabGroup.minimize();
                }

                tabGroups.push(tabGroup);
            } else {
                console.error('Not enough valid tab identifiers within tab blob to form a tab group', groupDef.tabs);
            }
        }

        return tabGroups;
    }

    public getTabProperties(tab: DesktopWindow): TabProperties {
        const savedProperties: string|null = localStorage.getItem(tab.id);
        if (savedProperties) {
            return JSON.parse(savedProperties);
        }

        const {icon, title} = tab.currentState;

        // Title isn't always available when window is created
        // If title is empty, re-request from window then send update to tabstrip
        if (title === '') {
            tab.refresh().then(() => {
                const {icon: newIcon, title: newTitle} = tab.currentState;

                if (newTitle !== '') {
                    const properties: TabProperties = {icon: newIcon, title: newTitle};
                    const event: TabPropertiesUpdatedEvent = {identity: tab.identity, properties, type: 'tab-properties-updated'};
                    this.sendTabEvent(tab, event);
                }
            }, console.warn);
        }

        return {icon, title: title || tab.identity.name};
    }

    public updateTabProperties(tab: DesktopWindow, properties: Partial<TabProperties>): void {
        const tabProps: TabProperties = this.getTabProperties(tab);
        const newProps: TabProperties = {...tabProps, ...properties};

        if (!deepEqual(newProps, tabProps)) {
            // Save properties
            Object.assign(tabProps, properties);
            localStorage.setItem(tab.id, JSON.stringify(tabProps));

            // Send events
            const event: TabPropertiesUpdatedEvent = {identity: tab.identity, properties: tabProps, type: 'tab-properties-updated'};
            this.sendTabEvent(tab, event);
        }
    }

    public async applyTabTarget(target: TabTarget|EjectTarget): Promise<void> {
        const activeIdentity: WindowIdentity = target.activeWindow.identity;
        const existingTabGroup: DesktopTabGroup|null = target.activeWindow.tabGroup;
        const windowUnderPoint = target.type === eTargetType.TAB && target.targetWindow;
        const tabGroupUnderPoint = windowUnderPoint && windowUnderPoint.tabGroup;
        const tabAllowed = target.valid;

        const activeDesktopWindow = this._model.getWindow(activeIdentity);

        if (!activeDesktopWindow) {
            return;
        }

        if (tabGroupUnderPoint) {
            // If we are over a tab group

            if (existingTabGroup !== tabGroupUnderPoint && tabAllowed) {
                // And that tab group is not the one we are ejecting from

                if (existingTabGroup) {
                    await existingTabGroup.removeTab(activeDesktopWindow);
                }

                // Add ejected tab to tab group under Point.
                await tabGroupUnderPoint.addTab(activeDesktopWindow);

            } else {
                // Tab has been dragged and dropped onto the same tab group, do nothing.
                // This was probably a tab re-ordering operation. This is handled separately
            }
        } else if (tabAllowed && windowUnderPoint && !tabGroupUnderPoint && target.valid) {
            // If there is a window under our Point, and its not part of a tab group, and we are over a valid drop area
            if (existingTabGroup) {
                await existingTabGroup.removeTab(activeDesktopWindow);
                await activeDesktopWindow.setAsForeground();
            }

            // Create new tab group
            await this.createTabGroupWithTabs([windowUnderPoint.identity, activeIdentity], activeIdentity);
        } else if (target.type === eTargetType.EJECT && existingTabGroup) {
            // If there are no windows under the point and we are being ejected from a tab group

            // We eject at the Point
            const prevHalfSize = activeDesktopWindow.currentState.halfSize;
            const halfSize = {x: prevHalfSize.x, y: prevHalfSize.y + existingTabGroup.config.height / 2};
            const center = {x: target.position.x + halfSize.x, y: target.position.y + halfSize.y};
            await existingTabGroup.removeTab(activeDesktopWindow, {center, halfSize});
            await activeDesktopWindow.setAsForeground();
        }
    }

    /**
     * Generates a valid tabbing target for a given active group in its current position.
     * @param {DesktopSnapGroup} activeGroup The current active group being moved by the user.
     */
    public getTarget(activeWindow: DesktopEntity): TabTarget|EjectTarget|null {
        const position: Point|null = this._model.mouseTracker.getPosition();

        if (!position) {
            // We should get a mouse position whenever we are running a getTarget op.
            return null;
        }

        if (!this.isEntityTabEnabled(activeWindow)) {
            return null;
        }

        const activeGroup = activeWindow.snapGroup;
        const targetWindow: DesktopWindow|null = this.getTargetWindow(position, activeWindow);

        /**
         * Checks if the mouse position is outside of the activeWindows group bounds.  Needed for tab drag & drop validity check.
         */
        const isMouseInsideGroupBounds = activeWindow.tabGroup ?
            RectUtils.isPointInRect(activeWindow.tabGroup.currentState.center, activeWindow.tabGroup.currentState.halfSize, position) :
            RectUtils.isPointInRect(activeWindow.currentState.center, activeWindow.currentState.halfSize, position);

        /**
         * Checks the mouse position is over a valid window drop area.
         */
        const isOverWindowValid: boolean = !!targetWindow && this.isOverWindowDropArea(targetWindow, position);

        /**
         * Checks if the window we are dragging is a tab group.
         */
        const activeTabGroup = activeWindow.tabGroup;

        /**
         * Prevent snapped windows from tabbing to other windows/groups
         */
        const targetAlreadySnapped: boolean = activeGroup.isNonTrivial();

        /**
         * Prevent windows that are snapped together from tabbing - only tab windows that are in different snap groups
         */
        const alreadyTabbed: boolean = !!targetWindow && targetWindow.snapGroup === activeGroup;

        /**
         * Validity conditions check for window over window tab target creation.
         */
        const targetWindowOverWindow = targetWindow && !targetAlreadySnapped && !alreadyTabbed && isOverWindowValid && !activeTabGroup;

        /**
         * Validity conditions check for tab dragging over window tab target creation.
         */
        const targetTabDragOverWindow = targetWindow && this._model.mouseTracker.isDraggingTab && isOverWindowValid;

        if (targetWindow && (targetWindowOverWindow || targetTabDragOverWindow)) {
            const targetTabGroup = targetWindow.tabGroup;

            // Check if the target and active window have same tab config.
            const valid =
                this.constraintsCompatible(activeWindow, targetTabGroup || targetWindow) && this.doEntitiesShareTabstripConfig(targetWindow, activeWindow);
            return {
                type: eTargetType.TAB,
                activeWindow,
                targetWindow,
                dropArea: this.getWindowDropArea(targetWindow),
                valid,
                tabDragging: this._model.mouseTracker.isDraggingTab
            };
        } else if (
            activeTabGroup && this._model.mouseTracker.isDraggingTab &&
            (!isMouseInsideGroupBounds || isMouseInsideGroupBounds && !this.isOverWindowDropArea(activeWindow as DesktopWindow, position))) {
            return {type: eTargetType.EJECT, activeWindow, position, valid: true};
        }

        return null;
    }

    /**
     * Determines if two windows can be tabbed together. The windows being tabbed can be identified in one of two ways.
     *
     * @param item1 Details about the first entity, either window about to be tabbed or the tabstrip a window is to be added to
     * @param item2 Details about the second entity, either window about to be tabbed or the tabstrip a window is to be added to
     */
    public canTabTogether(item1: DesktopEntity, item2: DesktopEntity): boolean {
        return this.isEntityTabEnabled(item1) && this.isEntityTabEnabled(item2) && this.doEntitiesShareTabstripConfig(item1, item2);
    }

    private doEntitiesShareTabstripConfig(item1: DesktopEntity, item2: DesktopEntity): boolean {
        const configs: ApplicationUIConfig[] = [item1, item2].map(entity => {
            const isTabstrip = !!entity.tabGroup && entity.tabGroup.window === entity;

            if (isTabstrip) {
                return entity.tabGroup!.config;
            } else {
                const config = this._config.query(entity.scope);
                return config.tabstrip;
            }
        });

        return this.areTabstripConfigurationsCompatible(configs[0], configs[1]);
    }

    private areTabstripConfigurationsCompatible(config1: ApplicationUIConfig, config2: ApplicationUIConfig): boolean {
        return config1.url === config2.url && config1.height === config2.height;
    }

    private isEntityTabEnabled(entity: DesktopEntity): boolean {
        const isTabstrip = !!entity.tabGroup && entity.tabGroup.window === entity;

        if (isTabstrip) {
            return true;
        } else {
            const config = this._config.query(entity.scope);
            return config.features.tab;
        }
    }

    private getScope(x: WindowIdentity|DesktopEntity): Scope {
        return (x as DesktopEntity).scope || {level: 'window', ...x as WindowIdentity};
    }

    /**
     * Sends an event to both a tab window, and the tabstrip of the tab's tabgroup - if the window is tabbed.
     *
     * @param tab Modified window
     * @param event Event to send
     */
    private sendTabEvent(tab: DesktopWindow, event: LayoutsEvent): void {
        tab.sendEvent(event);
        if (tab.tabGroup) {
            tab.tabGroup.window.sendEvent(event);
        }
    }


    /**
     * Returns the tabstrip configuration for the given window. This is a thin wrapper around the config store.
     *
     * @param item A window object/identity
     */
    private getTabstripConfig(item: WindowIdentity|DesktopWindow): Tabstrip {
        return this._config.query(this.getScope(item)).tabstrip;
    }

    /**
     * Determines if a Point is over a valid tabbing drop area on a window. The default drop area is 100% width x height of the windows tab group.
     * @param {DesktopWindow} window
     * @param {Point} position
     */
    private isOverWindowDropArea(window: DesktopWindow, position: Point): boolean {
        const {center, halfSize} = this.getWindowDropArea(window);

        return RectUtils.isPointInRect(center, halfSize, position);
    }

    /**
     * Returns the Center and HalfSize of a valid tabbing area on a window.  If the window has a tabset, this will be the dimensions of the tab group window, if
     * not the dimensions will be tab group window inset.
     * @param {DesktopWindow} window The window to get area for.
     */
    private getWindowDropArea(window: DesktopWindow): Rectangle {
        const isTabbed = window.tabGroup;
        if (isTabbed) {
            const {halfSize, center} = isTabbed.window.currentState;
            return {center, halfSize};
        } else {
            const state: EntityState = window.currentState;
            const config: Tabstrip = this.getTabstripConfig(window);
            const center: Point = {x: state.center.x, y: (state.center.y - state.halfSize.y) + (config.height / 2)};
            const halfSize = {x: state.halfSize.x, y: config.height / 2};

            return {center, halfSize};
        }
    }

    private getTargetWindow(position: Point, activeWindow: DesktopEntity): DesktopWindow|null {
        const exclude = this._model.mouseTracker.isDraggingTab ? undefined : activeWindow.identity;
        const candidateTarget = this._model.getWindowAt(position.x, position.y, exclude);

        if (candidateTarget) {
            return this.isEntityTabEnabled(candidateTarget) ? candidateTarget : null;
        } else {
            return null;
        }
    }

    private constraintsCompatible(active: DesktopEntity, target: DesktopEntity): boolean {
        const targetSize: Point = PointUtils.scale(target.currentState.halfSize, 2);
        const activeSize: Point = PointUtils.scale(active.currentState.halfSize, 2);
        const targetConstraints = target.currentState.resizeConstraints;
        const activeConstraints = active.currentState.resizeConstraints;

        // Adjust heights for windows not currently in a tabGroup
        if (!target.tabGroup) {
            targetSize.y -= this._config.query(target.scope).tabstrip.height;
        }
        if (!active.tabGroup) {
            activeSize.y -= this._config.query(active.scope).tabstrip.height;
        }

        let result = true;
        // Active is able to be resized in direction where resize would be needed.
        result = result &&
            ((targetSize.x === activeSize.x || activeConstraints.x.resizableMin || activeConstraints.x.resizableMax) &&
             (targetSize.y === activeSize.y || activeConstraints.y.resizableMin || activeConstraints.y.resizableMax));
        // Target is able to be resized in direction where resize would be needed.
        result = result && (targetConstraints.y.resizableMin || targetConstraints.y.resizableMax);
        // Projected size after tabbing is within active's size constraints
        result = result &&
            (targetSize.x >= activeConstraints.x.minSize && targetSize.x <= activeConstraints.x.maxSize && targetSize.y >= activeConstraints.y.minSize &&
             targetSize.y <= activeConstraints.y.maxSize);
        // Projected size after tabbing is within targets's size constraints
        result = result && targetSize.y >= targetConstraints.y.minSize;
        // Union of both constraints would form a valid constraint
        result = result &&
            (targetConstraints.x.maxSize >= activeConstraints.x.minSize && targetConstraints.x.minSize <= activeConstraints.x.maxSize &&
             targetConstraints.y.maxSize >= activeConstraints.y.minSize && targetConstraints.y.minSize <= activeConstraints.y.maxSize);

        return result;
    }
}
