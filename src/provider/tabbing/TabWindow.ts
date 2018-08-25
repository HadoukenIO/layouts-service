import {TabIdentifier, TabWindowOptions} from '../../client/types';
import {AsyncWindow} from './asyncWindow';
import {Tab} from './Tab';
import {TabGroup} from './TabGroup';

/**
 * Handles the window for the Tab
 */
export class TabWindow extends AsyncWindow {
    /**
     * Handle to the Tab which this window belongs.
     */
    private _tab: Tab;

    /**
     * Handle to the TabGroup this Tab belongs to.
     */
    private _tabGroup: TabGroup;

    /**
     * The initial options of the tab window.
     */
    private _initialWindowOptions!: fin.WindowOptions;

    /**
     * The intitial bounds of the tab window.
     */
    private _initialWindowBounds!: fin.WindowBounds;

    /**
     * Constructor of the TabWindow Class.
     * @param tab Tab that the window belongs to.
     * @param tabID Identifier of the tab app window (uuid, name)
     */
    constructor(tab: Tab, tabID: TabIdentifier) {
        super();
        this._tab = tab;
        this._tabGroup = tab.tabGroup;

        this._window = fin.desktop.Window.wrap(tabID.uuid, tabID.name);
    }

    /**
     * Initializes the async methods required for the TabWindow class.
     */
    public async init(): Promise<void> {
        [this._initialWindowOptions, this._initialWindowBounds] = await Promise.all([this.getWindowOptions(), this.getWindowBounds()]);

        // @ts-ignore resizeRegion.sides is valid.  Its not in the type file.
        this.updateWindowOptions({showTaskbarIcon: false, frame: false, resizeRegion: {sides: {top: false}}});

        this._createWindowEventListeners();
    }

    /**
     * Hides the tab window.
     */
    public async hideWindow() {
        return this._window.hide();
    }

    /**
     * Shows the tab window. If the window is minimized we will restore it.
     */
    public async showWindow() {
        const state = await this.getState();

        if (state === 'minimized') {
            this._window.restore();
        }

        return this._window.show();
    }

    /**
     * Aligns the position of this tab window to the position of the tab set group window.
     */
    public async alignPositionToTabGroup(): Promise<void> {
        const groupWindow = this._tab.tabGroup.window;
        const groupActiveTab = this._tab.tabGroup.activeTab;

        const tabGroupBoundsP = groupWindow.getWindowBounds();
        const tabBoundsP = groupActiveTab ? groupActiveTab.window.getWindowBounds() : this.getWindowBounds();

        const [tabGroupBounds, tabBounds] = await Promise.all([tabGroupBoundsP, tabBoundsP]);

        const resize = new Promise((res, rej) => {
            this._window.resizeTo(tabGroupBounds.width!, tabBounds.height!, 'top-left', res, rej);
        });

        const moveTo = new Promise((res, rej) => {
            this._window.moveTo(tabGroupBounds.left!, tabGroupBounds.top! + tabGroupBounds.height!, res, rej);
        });

        await Promise.all([resize, moveTo]);
        console.log('[Tabbing][alignPositionToTabGroup] - joinGroup');
        this._window.joinGroup(groupWindow.finWindow);
    }

    /**
     * Initializes event listeners for this windows events.
     */
    protected _createWindowEventListeners(): void {
        this._window.addEventListener('minimized', this._onMinimize.bind(this));

        this._window.addEventListener('maximized', this._onMaximize.bind(this));

        // this._window.addEventListener("restored", this._onRestore.bind(this));

        this._window.addEventListener('closed', this._onClose.bind(this));

        // this._window.addEventListener("focused", this._onFocus.bind(this));

        this._window.addEventListener('bounds-changed', this._onBoundsChanged.bind(this));
    }

    /**
     * Handles when the window is minimized.  If the window being minimized is the active tab, we will minimize the tab group as well.
     */
    private _onMinimize(): void {
        if (this._tab === this._tabGroup.activeTab) {
            this._tabGroup.window.minimizeGroup();
        }
    }

    /**
     * Handles when the window is maximized. This will maximize the tab group.
     */
    private _onMaximize(): void {
        this._tabGroup.window.maximizeGroup();
    }

    /**
     * Handles when the window is restored.  If this is the active tab then we will restore the entire tab group.  If not we will set the active tab to the
     * window restored, then restore the tab group.
     */
    private _onRestore(): void {
        if (this._tab === this._tabGroup.activeTab) {
            this._tabGroup.window.restoreGroup();
        } else {
            this._tabGroup.switchTab(this._tab.ID);
            this._tabGroup.window.restoreGroup();
        }
    }

    /**
     * Handles when the window is closed.  This will remove it from the tab group.
     */
    private _onClose(): void {
        this._tabGroup.removeTab(this._tab.ID, false, true);
    }

    /**
     * Handles when the window is focused.  If we are not the active window we will set the window being focused to be the active.
     */
    private _onFocus() {
        if (this._tab !== this._tabGroup.activeTab) {
            this._tabGroup.switchTab(this._tab.ID);
        }

        this._tabGroup.window.finWindow.bringToFront();
    }

    /**
     * Handles when the windows bounds have changed.  If we are the active tab + maximized state then we will call a restore on the tab group to shrink us back
     * down to before maximized size.
     */
    private _onBoundsChanged() {
        if (this._tab === this._tabGroup.activeTab) {
            if (this._tabGroup.window.isMaximized) {
                this._tabGroup.window.restoreGroup();
            }
        }
    }

    /**
     * Returns the window options set during initialization.
     * @returns {fin.WindowOptions} Fin.WindowOptions
     */
    public get windowOptions(): fin.WindowOptions {
        return this._initialWindowOptions;
    }
}
