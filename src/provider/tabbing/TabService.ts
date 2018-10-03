import {Application} from 'hadouken-js-adapter';

import {ApplicationUIConfig, Bounds, TabIdentifier, TabPackage, TabWindowOptions} from '../../client/types';

import {APIHandler} from './APIHandler';
import {ApplicationConfigManager} from './components/ApplicationConfigManager';
import {DragWindowManager} from './DragWindowManager';
import {getTabSaveInfo} from './SaveAndRestoreAPI';
import {Tab} from './Tab';
import {TabGroup} from './TabGroup';
import {createTabGroupsFromTabBlob} from './TabUtilities';
import {ZIndexer} from './ZIndexer';

interface GroupTabBounds extends Bounds {
    group: TabGroup;
}

/**
 * The overarching class for the Tab Service.
 */
export class TabService {
    /**
     * Handle of this Tab Service Instance.
     */
    public static INSTANCE: TabService;

    /**
     * Flag to disable / enable tabbing operations.
     */
    public disableTabbingOperations: boolean = false;

    /**
     * Handle to the Tabbing API Handler
     */
    public apiHandler: APIHandler;

    /**
     * Contains all the tabsets of this service.
     */
    private _tabGroups: TabGroup[];

    /**
     * Handle to the DragWindowManager
     */
    private _dragWindowManager: DragWindowManager;

    /**
     * Handle to the ZIndexer
     */
    private _zIndexer: ZIndexer = new ZIndexer();

    /**
     * Handles the application ui configs
     */
    private mApplicationConfigManager: ApplicationConfigManager;


    /**
     * Constructor of the TabService Class.
     */
    constructor() {
        this._tabGroups = [];
        this._dragWindowManager = new DragWindowManager();
        this._dragWindowManager.init();
        this.apiHandler = new APIHandler(this);

        this.mApplicationConfigManager = new ApplicationConfigManager();

        fin.desktop.InterApplicationBus.subscribe("*", "layoutsService:experimental:disableTabbing", (message, uuid, name) => {
            this.disableTabbingOperations = message;
        });

        TabService.INSTANCE = this;
    }

    /**
     * Creates a new tab group
     * @param {TabWindowOptions} WindowOptions Window Options used to create the tab group window (positions, dimensions, url, etc...)
     * @returns {TabGroup} TabGroup
     */
    public addTabGroup(windowOptions: TabWindowOptions): TabGroup {
        const group = new TabGroup(windowOptions);
        this._tabGroups.push(group);

        return group;
    }

    /**
     * Removes the tab group from the service and optionally closes all the groups tab windows.
     * @param ID ID of the tab group to remove.
     * @param closeApps Flag if we should close the groups tab windows.
     */
    public async removeTabGroup(ID: string, closeApps: boolean): Promise<void> {
        const groupIndex = this._getGroupIndex(ID);

        if (groupIndex !== -1) {
            const group = this._tabGroups[groupIndex];

            await group.removeAllTabs(closeApps);
            await group.window.close(true);

            this._tabGroups.splice(groupIndex, 1);
        }
    }

    /**
     * Returns a tab group searched by its ID.
     * @param ID ID of the tab group to find.
     * @returns {TabGroup | undefined} TabGroup
     */
    public getTabGroup(ID: string): TabGroup|undefined {
        return this._tabGroups.find((group: TabGroup) => {
            return group.ID === ID;
        });
    }

    /**
     * Returns a tab group searched by a tab it contains.
     * @param ID ID of the tab group to find.
     * @returns {TabGroup | undefined} Tabgroup
     */
    public getTabGroupByApp(ID: TabIdentifier): TabGroup|undefined {
        return this._tabGroups.find((group: TabGroup) => {
            return group.tabs.some((tab: Tab) => {
                const tabID = tab.ID;
                return tabID.name === ID.name && tabID.uuid === ID.uuid;
            });
        });
    }

    /**
     * Returns an individual Tab.
     * @param ID ID of the tab to get.
     */
    public getTab(ID: TabIdentifier): Tab|undefined {
        const group = this.getTabGroupByApp(ID);

        if (group) {
            return group.getTab(ID);
        }

        return;
    }

    /**
     * Creates a new tab group with provided tabs.  Will use the UI and position of the first Identity provided for positioning.
     * @param tabs An array of Identities to add to a group.
     */
    public async createTabGroupWithTabs(tabs: TabIdentifier[]) {
        if (tabs.length < 2) {
            console.error('createTabGroup called fewer than 2 tab identifiers');
            throw new Error('Must provide at least 2 Tab Identifiers');
        }
        const group = this.addTabGroup({});

        const tabsP = await Promise.all(tabs.map(async ID => await new Tab({tabID: ID}).init()));

        const firstTab: Tab = tabsP.shift() as Tab;

        const [bounds, state] = await Promise.all([firstTab.window.getWindowBounds(), firstTab.window.getState()]);
        tabsP.forEach(tab => tab.window.finWindow.setBounds(bounds.left, bounds.top, bounds.width, bounds.height));
        tabsP[tabsP.length - 1].window.finWindow.bringToFront();
        await group.addTab(firstTab, false);

        await Promise.all(tabsP.map(tab => group.addTab(tab, false)));
        await group.switchTab(tabs[tabs.length - 1]);
        await group.hideAllTabsMinusActiveTab();


        if (state === 'maximized') {
            group.window.maximizeGroup();
        }
        return;
    }
    /**
     * Checks for any windows that is under a specific point.
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @returns {TabGroup | null}
     */
    public async isPointOverTabGroup(x: number, y: number): Promise<TabGroup|null> {
        const groupTabBounds = await Promise.all(this._tabGroups.map(async group => {
            const activeTabBoundsP = group.activeTab.window.getWindowBounds();
            const groupBoundsP = group.window.getWindowBounds();
            const activeTabShowingP = group.activeTab.window.isShowing();

            const [activeTabBounds, groupBounds, activeTabShowing] = await Promise.all([activeTabBoundsP, groupBoundsP, activeTabShowingP]);

            if (!activeTabShowing) {
                return;
            }

            return {group, top: groupBounds.top!, left: groupBounds.left!, width: groupBounds.width!, height: groupBounds.height! + activeTabBounds.height!};
        }));

        const result: GroupTabBounds[] = groupTabBounds.filter((group): group is GroupTabBounds => {
            if (!group) {
                return false;
            }

            return x > group.left && x < group.width + group.left && y > group.top && y < group.top + group.height;
        });

        if (result) {
            const topOrdered = this._zIndexer.getTop(result.map(group => {
                return {uuid: group.group.activeTab.ID.uuid, name: group.group.activeTab.ID.name};
            }));

            if (topOrdered) {
                const f = result.find(g => {
                    return g.group.activeTab.ID.uuid === topOrdered[0].uuid && g.group.activeTab.ID.name === topOrdered[0].name;
                });

                if (f) {
                    return f.group;
                }
            }
        }

        return null;
    }

    /**
     * Returns the array index of a tab group.
     * @param ID ID of the tab group to search.
     * @returns {number} Index number.
     */
    private _getGroupIndex(ID: string): number {
        return this._tabGroups.findIndex((tab: TabGroup) => {
            return tab.ID === ID;
        });
    }

    /**
     * Returns the DragWindowManager instance.
     * @returns {DragWindowManager} DragWindowManager
     */
    public get dragWindowManager(): DragWindowManager {
        return this._dragWindowManager;
    }

    /**
     * Returns the Tab Group Array
     * @returns {TabGroup[]} Tab Groups Array
     */
    public get tabGroups(): TabGroup[] {
        return this._tabGroups;
    }

    /**
     * Returns the application config manager
     * @returns {ApplicationConfigManager} The container that holds the tab window options bound to the
     */
    public get applicationConfigManager(): ApplicationConfigManager {
        return this.mApplicationConfigManager;
    }
}
