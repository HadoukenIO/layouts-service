import {ApplicationUIConfig, Dimensions, TabBlob, TabIdentifier} from '../../client/types';
import {APIHandler} from '../APIHandler';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity, WindowState} from '../model/DesktopWindow';
import {Point} from '../snapanddock/utils/PointUtils';
import {Rectangle} from '../snapanddock/utils/RectUtils';

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
            // If a single untabbed window is being dragged, it is possible to create a tabset
            const activeIdentity: WindowIdentity = window.getIdentity();
            const activeState: WindowState = window.getState();

            // Ignore if we are dragging around a tabset
            if (window instanceof DesktopWindow) {
                const windowUnderPoint: DesktopWindow|null = this._model.getWindowAt(activeState.center.x, activeState.center.y, activeIdentity);
                const appConfigMgr: ApplicationConfigManager = this.mApplicationConfigManager;

                // There is a window under our drop point
                if (windowUnderPoint) {
                    const existingTabSet: DesktopTabGroup|null = windowUnderPoint.getTabGroup();

                    if (existingTabSet && appConfigMgr.compareConfigBetweenApplications(activeIdentity.uuid, existingTabSet.config)) {
                        // Add to existing tab group
                        existingTabSet.addTab(window);
                    } else if (
                        windowUnderPoint instanceof DesktopWindow &&
                        appConfigMgr.compareConfigBetweenApplications(windowUnderPoint.getIdentity().uuid, activeIdentity.uuid)) {
                        // If not a tab group then create a group with the 2 tabs.
                        this.createTabGroupWithTabs([windowUnderPoint.getIdentity(), activeIdentity], activeIdentity);
                    }
                }
            }
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

        // If we have a screen position we check if there is a tab group + tab window underneath
        const isOverTabWindow: DesktopWindow|null = ejectPosition ? this._model.getWindowAt(ejectPosition.x, ejectPosition.y) : null;
        const isOverTabGroup: DesktopTabGroup|null = isOverTabWindow && isOverTabWindow.getTabGroup();

        // Decide what to do with the tab
        if (!isOverTabWindow) {
            // Move tab out of tab group
            if (ejectPosition) {
                const prevHalfSize = ejectedTab.getState().halfSize;
                const halfSize = {x: prevHalfSize.x, y: prevHalfSize.y + tabGroup.config.height / 2};
                const center = {x: ejectPosition.x + halfSize.x, y: ejectPosition.y + halfSize.y};
                await tabGroup.removeTab(ejectedTab, {center, halfSize});
            } else {
                await tabGroup.removeTab(ejectedTab);
            }
            await ejectedTab.bringToFront();
        } else if (isOverTabGroup !== tabGroup) {
            // Move into another tab group
            if (this.applicationConfigManager.compareConfigBetweenApplications(isOverTabWindow.getIdentity().uuid, ejectedTab.getIdentity().uuid)) {
                if (isOverTabGroup) {
                    await tabGroup.removeTab(ejectedTab, null);
                    await isOverTabGroup.addTab(ejectedTab);
                } else {
                    await tabGroup.removeTab(ejectedTab, null);
                    await this.createTabGroupWithTabs([isOverTabWindow.getIdentity(), ejectedTab.getIdentity()]);
                }
            }
        } else {
            // Tab has been dragged and dropped onto the same tab group, do nothing.
            // This was probably a tab re-ordering operation. This is handled separately.
        }
    }
}
