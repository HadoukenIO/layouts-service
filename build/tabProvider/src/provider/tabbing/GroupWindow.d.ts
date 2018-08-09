import { TabWindowOptions } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { TabGroup } from "./TabGroup";
import { TabWindow } from "./TabWindow";
/**
 * Handles the window for the Tab-Set
 */
export declare class GroupWindow extends AsyncWindow {
    /**
     * The initial window options used to create this window.
     */
    private _initialWindowOptions;
    /**
     * Used to store the window bounds before a maximized is called.
     */
    private _beforeMaximizeBounds;
    /**
     * Handle to this windows tab group.
     */
    private _tabGroup;
    /**
     * Flag for if the window is maximized.
     */
    private _isMaximized;
    /**
     * Handle to the Tab service.
     */
    private _service;
    /**
     * Constructor for the GroupWindow Class.
     * @param windowOptions Window Options for creating the tab set.
     * @param tabGroup The tab group to which this window belongs.
     */
    constructor(windowOptions: TabWindowOptions, tabGroup: TabGroup);
    /**
     * Initialized Async methods for the GroupWindow class.
     */
    init(): Promise<void>;
    /**
     * Aligns this tab set window on top of a provided window.
     * @param app Window to align this tab set window to.
     */
    alignPositionToApp(app: TabWindow): Promise<void>;
    /**
     * Toggles the window to a maximized state.  If the window is maximized we will restore it, if not we will maximize it.
     */
    toggleMaximize(): Promise<void | void[]>;
    /**
     * Maximizes the tab set window.  This will resize the tab window to as large as possible with the tab set window on top.
     */
    maximizeGroup(): Promise<void>;
    /**
     * Restores the tab set window.  If the tab set window is in a maximized state we will restore the window to its "before maximized" bounds.
     */
    restoreGroup(): Promise<void | void[]>;
    /**
     * Minimizes the tab set window and all tab windows.
     */
    minimizeGroup(): Promise<[Promise<void>[], void]>;
    /**
     * Closes the tab set window and all its apps.
     */
    closeGroup(): Promise<void>;
    /**
     * Creates event listeners for the tab set window.
     */
    protected _createWindowEventListeners(): void;
    /**
     * Returns the maximized state
     * @returns {boolean} is Maximized?
     */
    /**
    * Sets the is Maximized flag.
    */
    isMaximized: boolean;
    /**
     * Creates the tab set window using the window options passed in during initialization.
     */
    private _createTabWindow;
    /**
     * Returns the initial window options provided during initialization.
     * @returns {TabWindowOptions} TabWindowOptions
     */
    readonly initialWindowOptions: TabWindowOptions;
}
