import {ApplicationUIConfig, Bounds, TabIdentifier, TabServiceID, TabWindowOptions} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity} from '../model/DesktopWindow';
import {Rectangle} from '../snapanddock/utils/RectUtils';

import {APIHandler} from './APIHandler';
import {ApplicationConfigManager} from './components/ApplicationConfigManager';
import {DragWindowManager} from './DragWindowManager';
import {Tab} from './Tab';

interface GroupTabBounds extends Bounds {
    group: DesktopTabGroup;
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
     * Handle to the Tabbing API Handler
     */
    public apiHandler: APIHandler;

    private model: DesktopModel;

    /**
     * Contains all the tabsets of this service.
     */
    // private _tabGroups: TabGroup[];

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
        this.model = model;
        this._dragWindowManager = new DragWindowManager();
        this._dragWindowManager.init();
        this.apiHandler = new APIHandler(this);

        this.mApplicationConfigManager = new ApplicationConfigManager();

        TabService.INSTANCE = this;
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
     * @returns {DesktopTabGroup[]} Tab Groups Array
     */
    public get tabGroups(): DesktopTabGroup[] {
        return this.model.getTabGroups() as DesktopTabGroup[];
    }

    /**
     * Returns the application config manager
     * @returns {ApplicationConfigManager} The container that holds the tab window options bound to the
     */
    public get applicationConfigManager(): ApplicationConfigManager {
        return this.mApplicationConfigManager;
    }

    /**
     * Creates a new tab group
     * @param {ApplicationUIConfig} WindowOptions Window Options used to create the tab group window (positions, dimensions, url, etc...)
     * @returns {DesktopTabGroup} TabGroup
     */
    public addTabGroup(snapGroup: DesktopSnapGroup, windowOptions: TabWindowOptions): DesktopTabGroup {
        const group = new DesktopTabGroup(snapGroup, windowOptions);
        // this._tabGroups.push(group);

        return group;
    }

    /**
     * Removes the tab group from the service and optionally closes all the groups tab windows.
     * @param ID ID of the tab group to remove.
     * @param closeApps Flag if we should close the groups tab windows.
     */
    public async removeTabGroup(ID: string, closeApps: boolean): Promise<void> {
        const group: DesktopTabGroup|null = this.model.getTabGroup(ID);
        if (group) {
            await group.removeAllTabs(closeApps);
            await group.window.getWindow().close(true);
        } else {
            throw new Error('No tab group with ID ' + ID);
        }
    }

    /**
     * Returns a tab group searched by its ID.
     * @param ID ID of the tab group to find.
     * @returns {DesktopTabGroup | undefined} TabGroup
     */
    public getTabGroup(ID: string): DesktopTabGroup|null {
        return this.model.getTabGroup(ID);
    }

    /**
     * Returns a tab group searched by a tab it contains.
     * @param ID ID of the tab group to find.
     * @returns {DesktopTabGroup | undefined} Tabgroup
     */
    public getTabGroupByApp(ID: TabIdentifier): DesktopTabGroup|null {
        return this.model.getTabGroups().find((group: DesktopTabGroup) => {
            return group.tabs.some((tab: Tab) => {
                const tabID = tab.ID;
                return tabID.name === ID.name && tabID.uuid === ID.uuid;
            });
        }) ||
            null;
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

        const firstWindow: DesktopWindow|null = this.model.getWindow(tabs[0]);
        const firstWindowBounds: Rectangle = firstWindow ? firstWindow.getState() : {center: {x: 300, y: 300}, halfSize: {x: 300, y: 200}};
        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(tabs[0].uuid);
        const options: TabWindowOptions = {
            ...config,
            x: firstWindowBounds.center.x - firstWindowBounds.halfSize.x,
            y: firstWindowBounds.center.y - firstWindowBounds.halfSize.y,
            width: firstWindowBounds.halfSize.x * 2
        };

        const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
        const group = this.addTabGroup(snapGroup, options);
        const appBounds = {
            center: {x: firstWindowBounds.center.x, y: firstWindowBounds.center.y + (config.height / 2)},
            halfSize: {x: firstWindowBounds.halfSize.x, y: firstWindowBounds.halfSize.y - (config.height / 2)}
        };
        firstWindow!.applyProperties(appBounds);

        const tabsP = await Promise.all(tabs.map(async ID => await new Tab({tabID: ID}).init()));

        const firstTab: Tab = tabsP.shift() as Tab;

        const [bounds, state] = await Promise.all([firstTab.window.getWindowBounds(), firstTab.window.getState()]);
        tabsP.forEach(tab => tab.window.finWindow.setBounds(bounds.left, bounds.top, bounds.width, bounds.height));
        tabsP[tabsP.length - 1].window.finWindow.bringToFront();
        console.log('A');
        await group.addTab(firstTab, false);
        console.log('B');

        await Promise.all(tabsP.map(tab => group.addTab(tab, false)));
        console.log('C');
        await group.switchTab(tabs[tabs.length - 1]);
        console.log('D');
        await group.hideAllTabsMinusActiveTab();
        console.log('E');


        if (state === 'maximized') {
            group.maximize();
        }
        console.log('F');
        return;
    }
    /**
     * Checks for any windows that is under a specific point.
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @returns {DesktopTabGroup | null}
     */
    public async isPointOverTabGroup(x: number, y: number): Promise<DesktopTabGroup|null> {
        const window: DesktopWindow|null = this.model.getWindowAt(x, y);
        const tabGroups: ReadonlyArray<DesktopTabGroup> = this.model.getTabGroups();

        if (window) {
            const identity: WindowIdentity = window.getIdentity();

            if (window.getIdentity().uuid === TabServiceID.UUID) {
                // Find tab group that has 'window' as its tabstrip
                return tabGroups.find((group: DesktopTabGroup) => {
                    const identity = group.window.getIdentity();
                    return identity.uuid === TabServiceID.UUID && identity.name === identity.name;
                }) ||
                    null;
            } else {
                // Find tab group that has 'window' as a tab
                return tabGroups.find((group: DesktopTabGroup) => {
                    return group.tabs.some((tab: Tab) => {
                        const finWindow = tab.window.finWindow;
                        return finWindow.uuid === identity.uuid && finWindow.name === identity.name;
                    });
                }) ||
                    null;
            }
        } else {
            return null;
        }

        // const groupTabBounds = await Promise.all(this._tabGroups.map(async group => {
        //     const activeTabBoundsP = group.activeTab.window.getWindowBounds();
        //     const groupBoundsP = group.window.getWindowBounds();
        //     const activeTabShowingP = group.activeTab.window.isShowing();

        //     const [activeTabBounds, groupBounds, activeTabShowing] = await Promise.all([activeTabBoundsP, groupBoundsP, activeTabShowingP]);

        //     if (!activeTabShowing) {
        //         return;
        //     }

        //     return {group, top: groupBounds.top!, left: groupBounds.left!, width: groupBounds.width!, height: groupBounds.height! + activeTabBounds.height!};
        // }));

        // const result: GroupTabBounds[] = groupTabBounds.filter((group): group is GroupTabBounds => {
        //     if (!group) {
        //         return false;
        //     }

        //     return x > group.left && x < group.width + group.left && y > group.top && y < group.top + group.height;
        // });

        // if (result) {
        //     const topOrdered = this._zIndexer.getTop(result.map(group => {
        //         return {uuid: group.group.activeTab.ID.uuid, name: group.group.activeTab.ID.name};
        //     }));

        //     if (topOrdered) {
        //         const f = result.find(g => {
        //             return g.group.activeTab.ID.uuid === topOrdered[0].uuid && g.group.activeTab.ID.name === topOrdered[0].name;
        //         });

        //         if (f) {
        //             return f.group;
        //         }
        //     }
        // }

        // return null;
    }
}
