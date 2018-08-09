/// <reference types="openfin" />
import { TabIdentifier } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { Tab } from "./Tab";
/**
 * Handles the window for the Tab
 */
export declare class TabWindow extends AsyncWindow {
    /**
     * Handle to the Tab which this window belongs.
     */
    private _tab;
    /**
     * Handle to the TabGroup this Tab belongs to.
     */
    private _tabGroup;
    /**
     * The initial options of the tab window.
     */
    private _initialWindowOptions;
    /**
     * The intitial bounds of the tab window.
     */
    private _initialWindowBounds;
    /**
     * Constructor of the TabWindow Class.
     * @param tab Tab that the window belongs to.
     * @param tabID Identifier of the tab app window (uuid, name)
     */
    constructor(tab: Tab, tabID: TabIdentifier);
    /**
     * Initializes the async methods required for the TabWindow class.
     */
    init(): Promise<void>;
    /**
     * Hides the tab window.
     */
    hide(): Promise<void>;
    /**
     * Shows the tab window. If the window is minimized we will restore it.
     */
    show(): Promise<void>;
    /**
     * Aligns the position of this tab window to the position of the tab set group window.
     */
    alignPositionToTabGroup(): Promise<void>;
    /**
     * Initializes event listeners for this windows events.
     */
    protected _createWindowEventListeners(): void;
    /**
     * Handles when the window is minimized.  If the window being minimized is the active tab, we will minimize the tab group as well.
     */
    private _onMinimize;
    /**
     * Handles when the window is maximized. This will maximize the tab group.
     */
    private _onMaximize;
    /**
     * Handles when the window is restored.  If this is the active tab then we will restore the entire tab group.  If not we will set the active tab to the window restored, then restore the tab group.
     */
    private _onRestore;
    /**
     * Handles when the window is closed.  This will remove it from the tab group.
     */
    private _onClose;
    /**
     * Handles when the window is focused.  If we are not the active window we will set the window being focused to be the active.
     */
    private _onFocus;
    /**
     * Handles when the windows bounds have changed.  If we are the active tab + maximized state then we will call a restore on the tab group to shrink us back down to before maximized size.
     */
    private _onBoundsChanged;
    /**
     * Returns the window options set during initialization.
     * @returns {fin.WindowOptions} Fin.WindowOptions
     */
    readonly windowOptions: fin.WindowOptions;
}
