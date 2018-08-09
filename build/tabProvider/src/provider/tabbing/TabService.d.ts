import { TabIdentifier, TabWindowOptions } from "../../shared/types";
import { DragWindowManager } from "./DragWindowManager";
import { Tab } from "./Tab";
import { TabGroup } from "./TabGroup";
/**
 * The overarching class for the Tab Service.
 */
export declare class TabService {
    /**
     * Handle of this Tab Service Instance.
     */
    static INSTANCE: TabService;
    /**
     * Contains all the tabsets of this service.
     */
    private _tabGroups;
    /**
     * Handle to the AppApi Handler.
     */
    private _eventHandler;
    /**
     * Handle to the TabAPIActionProcessor
     */
    private mTabApiEventHandler;
    /**
     * Handle to the DragWindowManager
     */
    private _dragWindowManager;
    /**
     * Handle to the ZIndexer
     */
    private _zIndexer;
    /**
     * Handle to the save and restore API processor
     */
    private mSaveAndRestoreEventHandler;
    /**
     * Constructor of the TabService Class.
     */
    constructor();
    /**
     * Creates a new tab group
     * @param {TabWindowOptions} WindowOptions Window Options used to create the tab group window (positions, dimensions, url, etc...)
     * @returns {TabGroup} TabGroup
     */
    addTabGroup(windowOptions: TabWindowOptions): Promise<TabGroup>;
    /**
     * Removes the tab group from the service and optionally closes all the groups tab windows.
     * @param ID ID of the tab group to remove.
     * @param closeApps Flag if we should close the groups tab windows.
     */
    removeTabGroup(ID: string, closeApps: boolean): Promise<void>;
    /**
     * Returns a tab group searched by its ID.
     * @param ID ID of the tab group to find.
     * @returns {TabGroup | undefined} TabGroup
     */
    getTabGroup(ID: string): TabGroup | undefined;
    /**
     * Returns a tab group searched by a tab it contains.
     * @param ID ID of the tab group to find.
     * @returns {TabGroup | undefined} Tabgroup
     */
    getTabGroupByApp(ID: TabIdentifier): TabGroup | undefined;
    /**
     * Returns an individual Tab.
     * @param ID ID of the tab to get.
     */
    getTab(ID: TabIdentifier): Tab | undefined;
    /**
     * Checks for any windows that is under a specific point.
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @returns {TabGroup | null}
     */
    isPointOverTabGroup(x: number, y: number): Promise<TabGroup | null>;
    /**
     * Returns the array index of a tab group.
     * @param ID ID of the tab group to search.
     * @returns {number} Index number.
     */
    private _getGroupIndex;
    /**
     * Returns the DragWindowManager instance.
     * @returns {DragWindowManager} DragWindowManager
     */
    readonly dragWindowManager: DragWindowManager;
    /**
     * Returns the Tab Group Array
     * @returns {TabGroup[]} Tab Groups Array
     */
    readonly tabGroups: TabGroup[];
}
