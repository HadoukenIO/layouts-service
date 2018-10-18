import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';
import {ApplicationUIConfig, Dimensions, TabBlob, TabIdentifier} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity, WindowState} from '../model/DesktopWindow';
import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

import {ApplicationConfigManager} from './components/ApplicationConfigManager';
import {DragWindowManager} from './DragWindowManager';


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
        this._dragWindowManager = new DragWindowManager();
        this._dragWindowManager.init();

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
    public async createTabGroupWithTabs(tabIdentities: TabIdentifier[], activeTab?: TabIdentifier) {
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
                    'Tab list contained ' + (tabIdentities.length - tabs.length) + ' invalid identities', tabIdentities, tabs.map(tab => tab.getIdentity()));
            }
        }

        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(tabIdentities[0].uuid);
        const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
        const tabGroup: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, config);
        await tabGroup.addTabs(tabs, activeTab);

        if (tabs[0].getState().state === 'maximized') {
            tabGroup.maximize();
        }
    }

    /**
     * Removes a tab from a tab group.
     *
     * If given ID is invalid or doesn't belong to a tab set, method call has no effect.
     *
     * @param {TabIdentifier} tabID The identity of the tab to remove.
     */
    public async removeTab(tabID: TabIdentifier): Promise<void> {
        const tab: DesktopWindow|null = this._model.getWindow(tabID);
        const group: DesktopTabGroup|null = tab && tab.getTabGroup();

        if (group) {
            await group.removeTab(tab!);
        }
    }

    public async swapTab(toRemove: TabIdentifier, toAdd: TabIdentifier): Promise<void> {
        const tabToAdd: DesktopWindow|null = this._model.getWindow(toAdd);
        const tabToRemove: DesktopWindow|null = this._model.getWindow(toRemove);
        const group: DesktopTabGroup|null = tabToRemove && tabToRemove.getTabGroup();

        if (!tabToRemove || !group) {
            throw new Error(`No tab group found for ${toRemove}`);
        } else if (!tabToAdd) {
            throw new Error(`No window found for ${toAdd}`);
        }

        return group.swapTab(tabToRemove, tabToAdd);
    }

    /**
     * Gathers information from tab sets and their tabs, and returns as a JSON object back to the requesting application/window.
     */
    public async getTabSaveInfo(): Promise<TabBlob[]> {
        const tabGroups: ReadonlyArray<DesktopTabGroup> = this._model.getTabGroups();

        return Promise.all(tabGroups.map(async (group: DesktopTabGroup) => {
            const tabs: TabIdentifier[] = group.tabs.map((tab: DesktopWindow) => {
                return tab.getIdentity();
            });

            const appRect: Rectangle = group.activeTab.getState();
            const groupRect: Rectangle = group.window.getState();
            const groupInfo = {
                url: group.config.url,
                active: group.activeTab.getIdentity(),
                dimensions: {
                    x: groupRect.center.x - groupRect.halfSize.x,
                    y: groupRect.center.y - groupRect.halfSize.y,
                    width: groupRect.halfSize.x * 2,
                    tabGroupHeight: groupRect.halfSize.y * 2,
                    appHeight: appRect.halfSize.y * 2
                }
            };

            return {tabs, groupInfo};
        }));
    }


    /**
     * Takes a tabblob and restores windows based on the blob
     * @function createTabGroupsFromMultipleWindows
     * @param tabBlob[] Restoration data
     */
    public async createTabGroupsFromTabBlob(tabBlob: TabBlob[]): Promise<DesktopTabGroup[]> {
        const model: DesktopModel = this._model;
        const tabGroups: DesktopTabGroup[] = [];

        if (!tabBlob) {
            console.error('Unable to create tabgroup - no blob supplied');
            throw new Error('Unable to create tabgroup - no blob supplied');
        }

        for (const blob of tabBlob) {
            const tabs: DesktopWindow[] = blob.tabs.map(tab => model.getWindow(tab)).filter((tab): tab is DesktopWindow => !!tab);
            const dimensions: Dimensions = blob.groupInfo.dimensions;

            if (tabs.length >= 2) {
                // Create a tabstrip window in the correct position
                const tabstripOptions: ApplicationUIConfig = {url: blob.groupInfo.url, height: dimensions.tabGroupHeight};

                // Each tab group will be a stand-alone snap group
                const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
                const tabGroup: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, tabstripOptions);

                // Position first tab to cover entire tab area - both tabstrip and app bounds
                // The positions of tabstrip and subsequent tabs will all be based on this
                const combinedHeight: number = dimensions.tabGroupHeight + dimensions.appHeight;
                const appBounds: Rectangle = {
                    center: {x: dimensions.x + (dimensions.width / 2), y: dimensions.y + (combinedHeight / 2)},
                    halfSize: {x: dimensions.width / 2, y: combinedHeight / 2}
                };
                await tabs[0].applyProperties(appBounds);

                // Add tabs to group
                await tabGroup.window.sync();
                await tabGroup.addTabs(tabs, blob.groupInfo.active);
                await tabGroup.window.sync();

                tabGroups.push(tabGroup);
            } else {
                console.error('Not enough valid tab identifiers within tab blob to form a tab group', blob.tabs);
            }
        }

        return tabGroups;
    }

    /**
     * Takes the given window and tabs it to any other window at the same position.
     *
     * @param window Window that has just been moved by the user
     */
    public tabDroppedWindow(window: DesktopWindow): void {
        if (!this.disableTabbingOperations) {
            this.internalHandleWindowDrop(window, this._model.getMouseTracker().getPosition());
        }
    }

    /**
     * Ejects or moves a tab/tab group based criteria passed in.
     *
     * 1. If we receive a mouse position, we check if a tab group + tab app is under that point.  If there is a window under that point we check if
     * their URLs match and if they do, we allow tabbing to occur.  If not, we cancel out.
     *
     *
     * 2. If we receive a mouse position, we check if a tab group + tab app is under that point.  If there is not a window under that point we
     * create a new tab group + tab at the position provided if there are more than 1 tabs in the original group. If there is only one tab we move the
     * window.
     *
     *
     * 3. If we dont receive a mouse position, we create a new tabgroup + tab at the app windows existing position.
     *
     * @param tab The tab/application to be ejected from it's current tab group
     * @param ejectPosition The current position of the mouse (if known). Ejected tab will be moved to this location, and tabbed with any other (compatible)
     * window/tabgroup at this position.
     */
    public async ejectTab(tab: TabIdentifier, ejectPosition?: Point): Promise<void> {
        // Get the tab that was ejected.
        const ejectedTab: DesktopWindow|null = this._model.getWindow(tab);
        const tabGroup: DesktopTabGroup|null = ejectedTab && ejectedTab.getTabGroup();

        // if the tab is not valid then return out of here!
        if (!ejectedTab || !tabGroup) {
            console.error('Attempted to eject tab which is not in a tabgroup');
            throw new Error('Specified window is not in a tabGroup.');
        }

        this.internalHandleWindowDrop(ejectedTab, ejectPosition);
    }

    /**
     * Handles all possible tabbing actions when a window/tab is dropped.  The possibilies are:
     *
     * 1. If there is a window under our point and its a tab group different to the one we're leaving, we join into it.
     *
     * 2. If there is a window under our point, and its not a tab group window, and we are in its valid drop area, then we create a new tab group with it.
     *
     * 3. If there are no windows under the point, then we move the ejecting window to the point.
     *
     * 4. If there is no point then we only eject in current position.
     *
     * @param window The window being ejected or dropped
     * @param position The point where the window is being dropped at. If nothing is passed the window will be ejected at its current spot.
     */
    private async internalHandleWindowDrop(window: DesktopWindow, position: Point|null = null) {
        const activeIdentity: WindowIdentity = window.getIdentity();
        const existingTabGroup: DesktopTabGroup|null = window.getTabGroup();
        const windowUnderPoint: DesktopWindow|null = position && this._model.getWindowAt(position.x, position.y, activeIdentity);
        const tabGroupUnderPoint: DesktopTabGroup|null = windowUnderPoint && windowUnderPoint.getTabGroup();
        const tabAllowed = windowUnderPoint &&
            this.applicationConfigManager.compareConfigBetweenApplications(
                tabGroupUnderPoint ? tabGroupUnderPoint.config : windowUnderPoint.getIdentity().uuid, activeIdentity.uuid);

        if (tabGroupUnderPoint && windowUnderPoint === tabGroupUnderPoint.window) {
            // If we are over a tab group

            if (existingTabGroup !== tabGroupUnderPoint && tabAllowed) {
                // And that tab group is not the one we are ejecting from

                if (existingTabGroup) await existingTabGroup.removeTab(window);

                // Add ejected tab to tab group under Point.
                await tabGroupUnderPoint.addTab(window);

            } else {
                // Tab has been dragged and dropped onto the same tab group, do nothing.
                // This was probably a tab re-ordering operation. This is handled separately
            }
        } else if (tabAllowed && position && windowUnderPoint && !tabGroupUnderPoint && this.isOverWindowDropArea(windowUnderPoint, position)) {
            // If there is a window under our Point, and its not part of a tab group, and we are over a valid drop area

            if (existingTabGroup) await existingTabGroup.removeTab(window);

            // Create new tab group
            await this.createTabGroupWithTabs([windowUnderPoint.getIdentity(), activeIdentity], activeIdentity);

        } else if (position && existingTabGroup) {
            // If there are no windows under the point and we are being ejected from a tab group

            // We eject at the Point
            const prevHalfSize = window.getState().halfSize;
            const halfSize = {x: prevHalfSize.x, y: prevHalfSize.y + existingTabGroup.config.height / 2};
            const center = {x: position.x + halfSize.x, y: position.y + halfSize.y};
            await existingTabGroup.removeTab(window, {center, halfSize});

        } else if (existingTabGroup) {
            // If we are provided no Point

            // Eject tab at its current position
            await existingTabGroup.removeTab(window);
        }

        await window.bringToFront();
    }

    /**
     * Determines if a Point is over a valid tabbing drop area on a window. The default drop area is 100% width x height of the windows tab group.
     * @param {DesktopWindow} window
     * @param {Point} position
     */
    private isOverWindowDropArea(window: DesktopWindow, position: Point): boolean {
        const state: WindowState = window.getState();
        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(window.getIdentity().uuid);
        const dropAreaCenter: Point = {x: state.center.x, y: (state.center.y - state.halfSize.y) + (config.height / 2)};
        const dropAreaHalfSize = {x: state.halfSize.x, y: config.height / 2};

        return RectUtils.isPointInRect(dropAreaCenter, dropAreaHalfSize, position);
    }
}
