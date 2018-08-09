import { TabIdentifier, TabPackage, TabProperties } from "../../shared/types";
import { TabGroup } from "./TabGroup";
import { TabWindow } from "./TabWindow";
/**
 * The Tab class handles functionality related to the tab itself.
 */
export declare class Tab {
    /**
     * This Tabs ID (uuid, name);
     */
    private readonly _tabID;
    /**
     * Handle to the tab group that this tab belongs to.
     */
    private readonly _tabGroup;
    /**
     * The properties (title, icon) for the tab.
     */
    private _tabProperties;
    /**
     * Handle to this tabs window.
     */
    private _tabWindow;
    /**
     * Constructor for the Tab Class.
     * @param {TabPackage} tabPackage The tab package contains the uuid, name, and any properties for the tab.
     * @param {TabGroup} tabGroup The tab group to which this tab belongs.
     */
    constructor(tabPackage: TabPackage, tabGroup: TabGroup);
    /**
     * Initalizes Async methods required for the Tab Class.
     */
    init(): Promise<void>;
    /**
     * Remove the Tab from the group and possibly its window.
     * @param closeApp Flag if we should close the tabs window.
     */
    remove(closeApp: boolean): Promise<void>;
    /**
     * Updates the Tab properties with the passed values.
     * @param {TabProperties} props The tab properties to update.
     */
    updateTabProperties(props: TabProperties): void;
    /**
     * Saves the current Tab properties to the localstorage.
     */
    private _saveTabProperties;
    /**
     * Loads the Tab properties from the localstorage.
     * @returns {TabProperties} TabProperties
     */
    private _loadTabPropertiesFromStorage;
    /**
     * Returns a complete TabProperties set loaded from localstorage + default values.
     * @returns {TabProperties} TabProperties
     */
    private _loadTabProperties;
    /**
     * Returns this Tabs Tab Set.
     * @returns {TabGroup} TabGroup
     */
    readonly tabGroup: TabGroup;
    /**
     * Returns this Tabs window.
     * @returns {TabWindow} TabWindow
     */
    readonly window: TabWindow;
    /**
     * Returns this Tabs ID.
     * @returns {TabIdentifier} ID
     */
    readonly ID: TabIdentifier;
}
