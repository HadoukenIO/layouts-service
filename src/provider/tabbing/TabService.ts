import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';

import {TabPropertiesUpdatedPayload} from '../../client/types';
import {ApplicationUIConfig, TabGroup, TabGroupDimensions, TabProperties, WindowIdentity} from '../../client/types';
import {DesktopEntity} from '../model/DesktopEntity';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, EntityState} from '../model/DesktopWindow';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';
import {eTargetType, TargetBase} from '../WindowHandler';

import {ApplicationConfigManager} from './components/ApplicationConfigManager';
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
     * The specific window that is targeted in the target canidate group.
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
    /**
     * Flag to disable / enable tabbing operations.
     */
    public disableTabbingOperations = false;

    private _model: DesktopModel;

    /**
     * Handle to the DragWindowManager
     */
    private _dragWindowManager: DragWindowManager;

    /**
     * Handles the application ui configs
     */
    private mApplicationConfigManager: ApplicationConfigManager;

    /**
     * Constructor of the TabService Class.
     */
    constructor(model: DesktopModel) {
        this._model = model;
        this._dragWindowManager = new DragWindowManager(model);
        this.mApplicationConfigManager = new ApplicationConfigManager();
    }

    /**
     * Returns the DragWindowManager instance.
     */
    public get dragWindowManager(): DragWindowManager {
        return this._dragWindowManager;
    }

    /**
     * Returns the application config manager that holds any configuration data that has been set for each application
     */
    public get applicationConfigManager(): ApplicationConfigManager {
        return this.mApplicationConfigManager;
    }

    /**
     * Creates a new tab group with provided tabs.  Will use the UI and position of the first Identity provided for positioning.
     * @param tabIdentities An array of Identities to add to a group.
     */
    public async createTabGroupWithTabs(tabIdentities: WindowIdentity[], activeTab?: WindowIdentity) {
        if (tabIdentities.length < 2) {
            console.error('createTabGroup called fewer than 2 tab identifiers');
            throw new Error('Must provide at least 2 Tab Identifiers');
        }

        const tabs: DesktopWindow[] = tabIdentities.map((identity: WindowIdentity) => this._model.getWindow(identity))
                                          .filter((tab: DesktopWindow|null): tab is DesktopWindow => tab !== null);

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

        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(tabIdentities[0].uuid);
        const snapGroup: DesktopSnapGroup = tabs[0].snapGroup;
        const tabGroup: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, config);
        await tabGroup.addTabs(tabs, activeTab);

        if (tabs[0].currentState.state === 'maximized') {
            tabGroup.maximize();
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

            const appRect: Rectangle = group.activeTab.currentState;
            const groupRect: Rectangle = group.window.currentState;
            const config: ApplicationUIConfig|'default' = (group.config === ApplicationConfigManager.DEFAULT_CONFIG) ? 'default' : group.config;

            const groupInfo = {
                active: group.activeTab.identity,
                dimensions: {
                    x: groupRect.center.x - groupRect.halfSize.x,
                    y: groupRect.center.y - groupRect.halfSize.y,
                    width: groupRect.halfSize.x * 2,
                    appHeight: appRect.halfSize.y * 2
                },
                config
            };

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
                const tabstripOptions: ApplicationUIConfig =
                    groupDef.groupInfo.config === 'default' ? ApplicationConfigManager.DEFAULT_CONFIG : groupDef.groupInfo.config;

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
        // Special handling for workspace placeholder windows
        const modifiedTitle = tab.identity.uuid === fin.Window.me.uuid && title.startsWith('Placeholder-') ? 'Loading...' : title;
        return {icon, title: modifiedTitle};
    }

    public updateTabProperties(tab: DesktopWindow, properties: Partial<TabProperties>): void {
        const tabProps: TabProperties = this.getTabProperties(tab);
        Object.assign(tabProps, properties);
        localStorage.setItem(tab.id, JSON.stringify(tabProps));

        const payload: TabPropertiesUpdatedPayload = {identity: tab.identity, properties: tabProps};
        tab.sendMessage('tab-properties-updated', payload);

        if (tab.tabGroup) {
            tab.tabGroup.window.sendMessage('tab-properties-updated', payload);
        }
    }

    public async applyTabTarget(target: TabTarget|EjectTarget): Promise<void> {
        if (this.disableTabbingOperations) return;

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
        }

        await activeDesktopWindow.bringToFront();
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
            const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(window.identity.uuid);
            const center: Point = {x: state.center.x, y: (state.center.y - state.halfSize.y) + (config.height / 2)};
            const halfSize = {x: state.halfSize.x, y: config.height / 2};

            return {center, halfSize};
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

        const activeGroup = activeWindow.snapGroup;

        const targetWindow: DesktopWindow|null =
            this._model.getWindowAt(position.x, position.y, this._model.mouseTracker.isDraggingTab ? undefined : activeWindow.identity);

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
        const isActiveWindowTabbed = activeWindow.tabGroup;

        /**
         * Prevent snapped windows from tabbing to other windows/groups
         */
        const targetAlreadySnapped: boolean = activeGroup.entities.length > 1;

        /**
         * Prevent windows that are snapped together from tabbing - only tab windows that are in different snap groups
         */
        const alreadyTabbed: boolean = !!targetWindow && targetWindow.snapGroup === activeGroup;

        /**
         * Validity conditions check for window over window tab target creation.
         */
        const targetWindowOverWindow = targetWindow && !targetAlreadySnapped && !alreadyTabbed && isOverWindowValid && !isActiveWindowTabbed;

        /**
         * Validity conditions check for tab dragging over window tab target creation.
         */
        const targetTabDragOverWindow = targetWindow && this._model.mouseTracker.isDraggingTab && isOverWindowValid;

        if (targetWindow && (targetWindowOverWindow || targetTabDragOverWindow)) {
            const isTargetTabbed = targetWindow.tabGroup;

            // Check if the target and active window have same tab config.
            const valid = this.applicationConfigManager.compareConfigBetweenApplications(
                isTargetTabbed ? isTargetTabbed.config : targetWindow.identity.uuid,
                isActiveWindowTabbed ? isActiveWindowTabbed.config : activeWindow.identity.uuid);
            return {
                type: eTargetType.TAB,
                activeWindow,
                targetWindow,
                dropArea: this.getWindowDropArea(targetWindow),
                valid,
                tabDragging: this._model.mouseTracker.isDraggingTab
            };
        } else if (
            isActiveWindowTabbed && this._model.mouseTracker.isDraggingTab &&
            (!isMouseInsideGroupBounds || isMouseInsideGroupBounds && !this.isOverWindowDropArea(activeWindow as DesktopWindow, position))) {
            return {type: eTargetType.EJECT, activeWindow, position, valid: true};
        }

        return null;
    }
}
