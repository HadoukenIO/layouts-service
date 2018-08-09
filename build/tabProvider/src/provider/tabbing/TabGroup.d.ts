import { TabIdentifier, TabPackage, TabWindowOptions } from "../../shared/types";
import { GroupWindow } from "./GroupWindow";
import { Tab } from "./Tab";
/**
 * Handles functionality for the TabSet
 */
export declare class TabGroup {
    /**
     * The ID for the TabGroup.
     */
    readonly ID: string;
    /**
     * Handle to this tabgroups window.
     */
    private _window;
    /**
     * Tabs currently in this tab group.
     */
    private _tabs;
    /**
     * The active tab in the tab group.
     */
    private _activeTab;
    /**
     * Constructor for the TabGroup Class.
     * @param {TabWindowOptions} windowOptions
     */
    constructor(windowOptions: TabWindowOptions);
    /**
     * Initializes the async methods required for the TabGroup Class.
     */
    init(): Promise<void>;
    /**
     * Adds a Tab to the tabset.
     * @param {TabPackage} tabPackage The package containing uuid, name, tabProperties of the tab to be added.
     * @returns {Tab} The created tab.
     */
    addTab(tabPackage: TabPackage): Promise<Tab>;
    /**
     * Realigns all tab windows of the group to the position of the tab set window.
     */
    realignApps(): Promise<void[]>;
    /**
     * Deregisters the Tab from tabbing altogether.
     * @param ID ID (uuid, name) of the Tab to deregister.
     */
    deregisterTab(ID: TabIdentifier): Promise<void>;
    /**
     * Removes a specified tab from the tab group.
     * @param {TabIdentifier} tabID The Tabs ID to remove.
     * @param {boolean} closeApp Flag to force close the tab window or not.
     * @param {boolean} closeGroupWindowCheck Flag to check if we should close the tab set window if there are no more tabs.
     */
    removeTab(tabID: TabIdentifier, closeApp: boolean, closeGroupWindowCheck?: boolean): Promise<void>;
    /**
     * Switches the active Tab in the group. Hides current active window.
     * @param {TabIdentifier} ID The ID of the tab to set as active.
     * @param {boolean} hideActiveTab Flag if we should hide the current active tab.
     */
    switchTab(ID: TabIdentifier | null, hideActiveTab?: boolean): Promise<void>;
    /**
     * Removes all tabs from this tab set.
     * @param closeApp Flag if we should close the tab windows.
     */
    removeAllTabs(closeApp: boolean): Promise<void[]>;
    /**
     * Gets the tab with the specified identifier
     * @param tabID The tab identifier
     */
    getTab(tabID: TabIdentifier): Tab | undefined;
    /**
     * Sets the active tab.  Does not switch tabs or hide/show windows.
     * @param {Tab} tab The Tab to set as active.
     */
    setActiveTab(tab: Tab): void;
    /**
     * Finds the index of the specified Tab in the array.
     * @param tabID The ID of the Tab.
     * @returns {number} Index Number.
     */
    getTabIndex(tabID: TabIdentifier): number;
    /**
     * Returns the current active tab of the tab set.
     * @returns {Tab} The Active Tab
     */
    readonly activeTab: Tab;
    /**
     * Returns the tab sets window.
     * @returns {GroupWindow} The group window.
     */
    readonly window: GroupWindow;
    /**
     * Returns the tabs of this tab set.
     * @returns {Tab[]} Array of tabs.
     */
    readonly tabs: Tab[];
}
