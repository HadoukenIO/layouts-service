import {ApplicationUIConfig, TabBlob, TabIdentifier, TabWindowOptions} from '../../client/types';
import {APIHandler} from '../APIHandler';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity} from '../model/DesktopWindow';
import {Rectangle} from '../snapanddock/utils/RectUtils';

import {ApplicationConfigManager} from './components/ApplicationConfigManager';
import {DragWindowManager} from './DragWindowManager';


/**
 * The overarching class for the Tab Service.
 */
export class TabService {
    /**
     * Handle of this Tab Service Instance.
     */
    public static INSTANCE: TabService;

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

        TabService.INSTANCE = this;
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

        const firstWindow: DesktopWindow|null = this._model.getWindow(tabIdentities[0]);
        const firstWindowBounds: Rectangle = firstWindow ? firstWindow.getState() : {center: {x: 300, y: 300}, halfSize: {x: 300, y: 200}};
        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(tabIdentities[0].uuid);
        const options: TabWindowOptions = {
            ...config,
            x: firstWindowBounds.center.x - firstWindowBounds.halfSize.x,
            y: firstWindowBounds.center.y - firstWindowBounds.halfSize.y,
            width: firstWindowBounds.halfSize.x * 2
        };

        const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
        const group: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, options);
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

        await group.addTabs(tabs, activeTab);

        if (tabs[0].getState().state === 'maximized') {
            group.maximize();
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
    public async createTabGroupsFromTabBlob(tabBlob: TabBlob[]): Promise<void> {
        if (!tabBlob) {
            console.error('Unable to create tabgroup - no blob supplied');
            throw new Error('Unable to create tabgroup - no blob supplied');
        }

        for (const blob of tabBlob) {
            const newTabWindowOptions: TabWindowOptions = {
                url: blob.groupInfo.url,
                x: blob.groupInfo.dimensions.x,
                y: blob.groupInfo.dimensions.y,
                height: blob.groupInfo.dimensions.tabGroupHeight,
                width: blob.groupInfo.dimensions.width,
            };

            // Each tab set will be a stand-alone snap group
            const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();

            // Create new tabgroup
            const model: DesktopModel = this._model;
            const group: DesktopTabGroup = new DesktopTabGroup(this._model, snapGroup, newTabWindowOptions);
            const tabs: DesktopWindow[] = blob.tabs.map(tab => model.getWindow(tab)).filter((tab): tab is DesktopWindow => !!tab);

            if (tabs.length >= 2) {
                // Position first tab (positions of tabstrip and subsequent tabs will all be based on this)
                const bounds: Rectangle = {
                    center: {x: newTabWindowOptions.x + (newTabWindowOptions.width / 2), y: newTabWindowOptions.y + (newTabWindowOptions.height / 2)},
                    halfSize: {x: newTabWindowOptions.width / 2, y: newTabWindowOptions.height / 2}
                };
                await tabs[0].applyProperties(bounds);

                // Add tabs to group
                await group.addTabs(tabs, blob.groupInfo.active);
            } else {
                console.error('Not enough valid tab identifiers within tab blob to form a tab group', blob.tabs);
            }
        }
    }

    /**
     * Ejects or moves a tab/tab group based criteria passed in.
     *
     * 1. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is a window under that point we check if
     * their URLs match and if they do, we allow tabbing to occur.  If not, we cancel out.
     *
     *
     * 2. If we receive a screenX & screenY position, we check if a tab group + tab app is under that point.  If there is not a window under that point we
     * create a new tab group + tab at the screenX & screenY provided if there are more than 1 tabs in the original group. If there is only one tab we move the
     * window.
     *
     *
     * 3. If we dont receive a screenX & screenY position, we create a new tabgroup + tab at the app windows existing position.
     *
     * @param tab The tab/application to be ejected from it's current tab group
     * @param options Details about the eject target. Determines what happens to the tab once it is ejected.
     */
    public async ejectTab(tab: TabIdentifier, options: Partial<TabWindowOptions>): Promise<void> {
        // Get the tab that was ejected.
        const ejectedTab: DesktopWindow|null = this._model.getWindow(tab);
        const tabGroup: DesktopTabGroup|null = ejectedTab && ejectedTab.getTabGroup();

        // if the tab is not valid then return out of here!
        if (!ejectedTab || !tabGroup) {
            console.error('Attempted to eject tab which is not in a tabgroup');
            throw new Error('Specified window is not in a tabGroup.');
        }

        // If we have a screen position we check if there is a tab group + tab window underneath
        const isOverTabWindow: DesktopWindow|null = (options.x && options.y) ? this._model.getWindowAt(options.x, options.y) : null;
        const isOverTabGroup: DesktopTabGroup|null = isOverTabWindow && isOverTabWindow.getTabGroup();

        // Decide what to do with the tab
        if (!isOverTabWindow) {
            // Move tab out of tab group
            if (options.x && options.y) {
                const prevHalfSize = ejectedTab.getState().halfSize;
                const halfSize = {x: prevHalfSize.x, y: prevHalfSize.y + tabGroup.config.height / 2};
                const center = {x: options.x + halfSize.x, y: options.y + halfSize.y};
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
