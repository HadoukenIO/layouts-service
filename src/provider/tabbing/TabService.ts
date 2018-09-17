import {ApplicationUIConfig, Bounds, TabIdentifier, TabServiceID, TabWindowOptions} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, WindowIdentity, WindowState} from '../model/DesktopWindow';
import {Rectangle} from '../snapanddock/utils/RectUtils';

import {APIHandler} from './APIHandler';
import {ApplicationConfigManager} from './components/ApplicationConfigManager';
import {DragWindowManager} from './DragWindowManager';

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
        this.apiHandler = new APIHandler(model, this);

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

    public get desktopModel(): DesktopModel {
        //Temporary. Until TabUtilities are moved into service.
        return this.model;
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
            return group.tabs.some((tab: DesktopWindow) => {
                const identity: WindowIdentity = tab.getIdentity();
                return identity.name === ID.name && identity.uuid === ID.uuid;
            });
        }) ||
            null;
    }

    /**
     * Returns an individual Tab.
     * @param ID ID of the tab to get.
     */
    public getTab(ID: TabIdentifier): DesktopWindow|null {
        const group = this.getTabGroupByApp(ID);

        if (group) {
            return group.getTab(ID);
        }

        return null;
    }

    /**
     * Creates a new tab group with provided tabs.  Will use the UI and position of the first Identity provided for positioning.
     * @param tabIdentities An array of Identities to add to a group.
     */
    public async createTabGroupWithTabs(tabIdentities: TabIdentifier[]) {
        if (tabIdentities.length < 2) {
            console.error('createTabGroup called fewer than 2 tab identifiers');
            throw new Error('Must provide at least 2 Tab Identifiers');
        }

        const firstWindow: DesktopWindow|null = this.model.getWindow(tabIdentities[0]);
        const firstWindowBounds: Rectangle = firstWindow ? firstWindow.getState() : {center: {x: 300, y: 300}, halfSize: {x: 300, y: 200}};
        const config: ApplicationUIConfig = this.mApplicationConfigManager.getApplicationUIConfig(tabIdentities[0].uuid);
        const options: TabWindowOptions = {
            ...config,
            x: firstWindowBounds.center.x - firstWindowBounds.halfSize.x,
            y: firstWindowBounds.center.y - firstWindowBounds.halfSize.y,
            width: firstWindowBounds.halfSize.x * 2
        };

        const snapGroup: DesktopSnapGroup = new DesktopSnapGroup();
        const group = this.addTabGroup(snapGroup, options);
        // const appBounds = {
        //     center: {x: firstWindowBounds.center.x, y: firstWindowBounds.center.y + (config.height / 2)},
        //     halfSize: {x: firstWindowBounds.halfSize.x, y: firstWindowBounds.halfSize.y - (config.height / 2)}
        // };
        // firstWindow!.applyProperties(appBounds);

        // const tabsP = await Promise.all(tabs.map(async ID => await new Tab({tabID: ID}).init()));
        const tabs: DesktopWindow[] = tabIdentities.map((identity: WindowIdentity) => this.model.getWindow(identity))
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
        
        // const [bounds, state] = await Promise.all([firstTab.window.getWindowBounds(), firstTab.window.getState()]);
        // tabs.forEach(tab => tab.getWindow().setBounds(bounds.left, bounds.top, bounds.width, bounds.height));
        const firstTab: DesktopWindow = tabs.shift()!;
        const state: WindowState = firstTab.getState();
        const bounds: Partial<WindowState> = {center: state.center, halfSize: state.halfSize};
        // tabs.forEach((tab: DesktopWindow) => {
        //     tab.applyProperties(bounds);
        // });
        // tabs[tabs.length - 1].getWindow().bringToFront();
        await group.addTab(firstTab, false);

        await Promise.all(tabs.map(tab => group.addTab(tab, false)));
        // await group.switchTab(tabs[tabs.length - 1].getIdentity());
        // await group.hideAllTabsMinusActiveTab();

        if (state.state === 'maximized') {
            group.maximize();
        }
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

            if (identity.uuid === TabServiceID.UUID) {
                // Find tab group that has 'window' as its tabstrip
                return tabGroups.find((group: DesktopTabGroup) => {
                    const identity = group.window.getIdentity();
                    return identity.uuid === TabServiceID.UUID && identity.name === identity.name;
                }) ||
                    null;
            } else {
                // Find tab group that has 'window' as a tab
                const id: string = window.getId();
                return tabGroups.find((group: DesktopTabGroup) => {
                    return group.tabs.some((tab: DesktopWindow) => tab.getId() === id);
                }) ||
                    null;
            }
        } else {
            return null;
        }
    }
}
