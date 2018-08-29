import {TabIdentifier, TabWindowOptions} from '../../client/types';
import {SnapService} from '../snapanddock/SnapService';
import {SnapWindow} from '../snapanddock/SnapWindow';

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

        this._window = fin.desktop.Window.wrap(tabID.uuid, tabID.name);
    }

    /**
     * Initializes the async methods required for the TabWindow class.
     */
    public async init(): Promise<void> {
        [this._initialWindowOptions, this._initialWindowBounds] = await Promise.all([this.getWindowOptions(), this.getWindowBounds()]);
        this._createWindowEventListeners();
        // @ts-ignore resizeRegion.sides is valid.  Its not in the type file.
        return this.updateWindowOptions({showTaskbarIcon: false, frame: false, resizeRegion: {sides: {top: false}}});
    }

    /**
     * deinitializes the async methods required for the TabWindow class.
     */
    public async deInit(): Promise<void> {
        const bounds = await this.getWindowBounds();
        await this._window.resizeTo(bounds.width, bounds.height + this._tab.tabGroup.window.initialWindowOptions.height!, 'bottom-left');

        // Check if the window should have a frame
        const identity: TabIdentifier = this._tab.ID;
        const id = `${identity.uuid}/${identity.name}`;
        const windows: SnapWindow[] = (window as Window & {snapService: SnapService}).snapService['windows'];
        const snapWindow: SnapWindow|undefined = windows.find(window => window.getId() === id);
        const hasFrame: boolean = !snapWindow || snapWindow.getState().frame;  // If can't find the window (shouldn't be possible), assume window had a frame

        // @ts-ignore resizeRegion.sides is valid.  Its not in the type file.
        return this.updateWindowOptions({showTaskbarIcon: true, frame: hasFrame, resizeRegion: {sides: {top: true}}});
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
        this._window.leaveGroup();
        const groupWindow = this._tab.tabGroup.window;
        const groupActiveTab = this._tab.tabGroup.activeTab || this._tab.tabGroup.tabs[0];

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

        this._window.joinGroup(groupWindow.finWindow);
    }

    /**
     * Initializes event listeners for this windows events.
     */
    protected _createWindowEventListeners(): void {
        this._window.addEventListener('minimized', this._onMinimize.bind(this));

        this._window.addEventListener('maximized', this._onMaximize.bind(this));

        this._window.addEventListener('closed', this._onClose.bind(this));
    }

    /**
     * Handles when the window is minimized.  If the window being minimized is the active tab, we will minimize the tab group as well.
     */
    private _onMinimize(): void {
        if (this._tab === this._tab.tabGroup.activeTab) {
            this._tab.tabGroup.window.minimizeGroup();
        }
    }

    /**
     * Handles when the window is maximized. This will maximize the tab group.
     */
    private _onMaximize(): void {
        this._tab.tabGroup.window.maximizeGroup();
    }

    /**
     * Handles when the window is restored.  If this is the active tab then we will restore the entire tab group.  If not we will set the active tab to the
     * window restored, then restore the tab group.
     */
    private _onRestore(): void {
        if (this._tab === this._tab.tabGroup.activeTab) {
            this._tab.tabGroup.window.restoreGroup();
        } else {
            this._tab.tabGroup.switchTab(this._tab.ID);
            this._tab.tabGroup.window.restoreGroup();
        }
    }

    /**
     * Handles when the window is closed.  This will remove it from the tab group.
     */
    private _onClose(): void {
        this._tab.tabGroup.removeTab(this._tab.ID, false, true);
    }

    /**
     * Handles when the window is focused.  If we are not the active window we will set the window being focused to be the active.
     */
    private _onFocus() {
        if (this._tab !== this._tab.tabGroup.activeTab) {
            this._tab.tabGroup.switchTab(this._tab.ID);
        }

        this._tab.tabGroup.window.finWindow.bringToFront();
    }

    /**
     * Handles when the windows bounds have changed.  If we are the active tab + maximized state then we will call a restore on the tab group to shrink us back
     * down to before maximized size.
     */
    private _onBoundsChanged() {
        if (this._tab === this._tab.tabGroup.activeTab) {
            if (this._tab.tabGroup.window.isMaximized) {
                this._tab.tabGroup.window.restoreGroup();
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
