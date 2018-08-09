import { TabbingApi } from "../../../client/TabbingApi";
import { TabIdentifier, TabProperties } from "../../../shared/types";
import { Tab } from "./TabItem";
/**
 * Handles the management of tabs and some of their functionality.
 */
export declare class TabManager {
    /**
     *  The HTML Element container for the tabs.
     */
    static tabContainer: HTMLElement;
    /**
     * Handle to the Tabbing API
     */
    static tabAPI: TabbingApi;
    /**
     * An array of the tabs present in the window.
     */
    private tabs;
    /**
     * The currently active tab (highlighted).
     */
    private activeTab;
    /**
     * The last active tab before the current active tab.
     */
    private lastActiveTab;
    /**
     * Constructs the TabManager class.
     */
    constructor();
    /**
     * Creates a new Tab and renders.
     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
     */
    addTab(tabID: TabIdentifier, tabProps: TabProperties): Promise<void>;
    /**
     * Removes a Tab.
     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
     */
    removeTab(tabID: TabIdentifier, closeApp?: boolean): void;
    /**
     * Unsets the active tab
     * @method unsetActiveTab Removes the active status from the current active Tab.
     */
    unsetActiveTab(): void;
    /**
     * Sets a specified tab as active.  If no tab is specified then the first tab will be chosen.
     * @param {TabIdentifier | null} tabID An object containing the uuid, name for the external application/window or null.
     */
    setActiveTab(tabID?: TabIdentifier | null): void;
    /**
     * Finds and gets the Tab object.
     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
     */
    getTab(tabID: TabIdentifier): Tab | undefined;
    /**
     * Creates listeners for various IAB + Window Events.
     */
    private _setupListeners;
    /**
     * Gets the Tab index from the array.
     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
     */
    private _getTabIndex;
    /**
     * Returns an array of all the tabs.
     * @returns {Tab[]}
     */
    readonly getTabs: Tab[];
    /**
     * Returns the last active tab.
     * @returns {Tab | null} Last Active Tab
     */
    readonly getLastActiveTab: Tab | null;
    /**
     * Returns the active tab.
     * @returns {Tab} Active Tab
     */
    readonly getActiveTab: Tab;
}
