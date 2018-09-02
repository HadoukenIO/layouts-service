import {TabWindowOptions} from '../../client/types';
import {AsyncWindow} from './asyncWindow';
import {TabGroup} from './TabGroup';
import {TabService} from './TabService';
import {TabWindow} from './TabWindow';

export const DEFAULT_UI_URL = (() => {
    let providerLocation = window.location.href;

    if (providerLocation.indexOf('http://localhost') === 0) {
        // Work-around for fake provider used within test runner
        providerLocation = providerLocation.replace('/test', '/provider');
    }

    // Locate the default tabstrip HTML page, relative to the location of the provider
    return providerLocation.replace('provider.html', 'tabbing/tabstrip/tabstrip.html');
})();

/**
 * Handles the window for the Tab-Set
 */
export class GroupWindow extends AsyncWindow {
    /**
     * The initial window options used to create this window.
     */
    private _initialWindowOptions: TabWindowOptions;

    /**
     * Used to store the window bounds before a maximized is called.
     */
    private _beforeMaximizeBounds!: fin.WindowBounds;

    /**
     * Handle to this windows tab group.
     */
    private _tabGroup: TabGroup;

    /**
     * Flag for if the window is maximized.
     */
    private _isMaximized = false;

    /**
     * Handle to the Tab service.
     */
    private _service: TabService = TabService.INSTANCE;

    /**
     * Constructor for the GroupWindow Class.
     * @param windowOptions Window Options for creating the tab set.
     * @param tabGroup The tab group to which this window belongs.
     */
    constructor(windowOptions: TabWindowOptions, tabGroup: TabGroup) {
        super();
        this._tabGroup = tabGroup;

        this._initialWindowOptions = this._sanitizeTabWindowOptions(windowOptions);
    }

    private _sanitizeTabWindowOptions(windowOptions: TabWindowOptions) {
        return {
            url: windowOptions.url || undefined,
            width: windowOptions.width && !isNaN(windowOptions.width) ? windowOptions.width : undefined,
            height: windowOptions.height && !isNaN(windowOptions.height) ? windowOptions.height : 62,
            screenX: windowOptions.screenX && !isNaN(windowOptions.screenX) ? windowOptions.screenX : undefined,
            screenY: windowOptions.screenY && !isNaN(windowOptions.screenY) ? windowOptions.screenY : undefined
        };
    }

    /**
     * Initialized Async methods for the GroupWindow class.
     */
    public async init(): Promise<void> {
        this._window = await this._createTabWindow();
        this._createWindowEventListeners();
    }

    /**
     * Aligns this tab set window on top of a provided window.
     * @param app Window to align this tab set window to.
     */
    public async alignPositionToApp(app: TabWindow): Promise<void> {
        this.leaveGroup();
        const win: fin.OpenFinWindow = app.finWindow;
        const bounds = await app.getWindowBounds();

        const resizeTo = this._window.resizeTo(bounds.width!, this._initialWindowOptions.height!, 'top-left');
        await app.resizeTo(bounds.width, bounds.height - this._initialWindowOptions.height!, 'bottom-left');

        const moveTo = this._window.moveTo(bounds.left!, bounds.top!);

        await Promise.all([resizeTo, moveTo]);
        win.joinGroup(this._window!);
    }

    /**
     * Toggles the window to a maximized state.  If the window is maximized we will restore it, if not we will maximize it.
     */
    public async toggleMaximize(): Promise<void|void[]> {
        if (this._isMaximized) {
            return this.restoreGroup();
        } else {
            return this.maximizeGroup();
        }
    }

    /**
     * Maximizes the tab set window.  This will resize the tab window to as large as possible with the tab set window on top.
     */
    public async maximizeGroup(): Promise<void> {
        this._beforeMaximizeBounds = await this._tabGroup.activeTab.window.getWindowBounds();

        const moveto = this.moveTo(0, 0);
        const tabresizeto = this._tabGroup.activeTab.window.resizeTo(screen.availWidth, screen.availHeight - this._initialWindowOptions.height!, 'top-left');

        await Promise.all([moveto, tabresizeto]);

        this._isMaximized = true;
    }

    /**
     * Restores the tab set window.  If the tab set window is in a maximized state we will restore the window to its "before maximized" bounds.
     */
    public async restoreGroup(): Promise<void|void[]> {
        if (this._isMaximized) {
            if ((await this.getState()) === 'minimized') {
                return this._tabGroup.activeTab.window.restore();
            } else {
                const resize = this._tabGroup.activeTab.window.resizeTo(this._beforeMaximizeBounds.width!, this._beforeMaximizeBounds.height!, 'top-left');
                const moveto = this._tabGroup.window.moveTo(this._beforeMaximizeBounds.left!, this._beforeMaximizeBounds.top! - (this._tabGroup.window._initialWindowOptions.height || 62));
                this._isMaximized = false;
                return Promise.all([resize, moveto]);
            }
        } else {
            await Promise.all(this._tabGroup.tabs.map(tab => tab.window.restore()));
            return this._tabGroup.hideAllTabsMinusActiveTab();
        }
    }

    /**
     * Minimizes the tab set window and all tab windows.
     */
    public async minimizeGroup() {
        const minWins = this._tabGroup.tabs.map(tab => {
            return tab.window.minimize();
        });

        const group = this._window.minimize();

        return Promise.all([minWins, group]);
    }

    /**
     * Closes the tab set window and all its apps.
     */
    public async closeGroup(): Promise<void> {
        return this._service.removeTabGroup(this._tabGroup.ID, true);
    }

    /**
     * Creates event listeners for the tab set window.
     */
    protected _createWindowEventListeners(): void {
        this._window.addEventListener('focused', () => {
            this._tabGroup.activeTab.window.finWindow.bringToFront();
        });

        this._window.addEventListener('closed', () => {
            if (this._tabGroup.tabs.length > 0) {
                this._tabGroup.removeAllTabs(true);
            }
        });

        this._window.addEventListener('restored', this.restoreGroup.bind(this));

        this._window.addEventListener('minimized', this.minimizeGroup.bind(this));
    }

    /**
     * Returns the maximized state
     * @returns {boolean} is Maximized?
     */
    public get isMaximized(): boolean {
        return this._isMaximized;
    }

    /**
     * Sets the is Maximized flag.
     */
    public set isMaximized(maximized: boolean) {
        this._isMaximized = maximized;
    }


    public updateInitialWindowOptions(update: TabWindowOptions) {
        const sanitized = this._sanitizeTabWindowOptions(update);
        this._initialWindowOptions.url = sanitized.url || this._initialWindowOptions.url;
        this._initialWindowOptions.width = sanitized.width || this._initialWindowOptions.width;
        this._initialWindowOptions.height = sanitized.height || this._initialWindowOptions.height;
        this._initialWindowOptions.screenX = sanitized.screenX || this._initialWindowOptions.screenX;
        this._initialWindowOptions.screenY = sanitized.screenY || this._initialWindowOptions.screenY;
    }
    /**
     * Creates the tab set window using the window options passed in during initialization.
     */
    private async _createTabWindow(): Promise<fin.OpenFinWindow> {
        // @ts-ignore TS complains, but verified this is real and working.
        return new Promise((res, rej) => {
            const win = new fin.desktop.Window(
                {
                    name: this._tabGroup.ID,
                    url: this._initialWindowOptions.url || DEFAULT_UI_URL,
                    autoShow: true,
                    frame: false,
                    maximizable: false,
                    resizable: false,
                    defaultHeight: this._initialWindowOptions.height,
                    defaultWidth: this._initialWindowOptions.width,
                    defaultLeft: this._initialWindowOptions.screenX,
                    defaultTop: this._initialWindowOptions.screenY,
                    defaultCentered: !this._initialWindowOptions.screenX && !this._initialWindowOptions.screenY,
                    saveWindowState: false,
                    taskbarIconGroup: this._tabGroup.ID,
                    //@ts-ignore
                    backgroundThrottling: true,
                    waitForPageLoad: false
                },
                () => {
                    res(win);
                },
                (e: string) => {
                    rej(e);
                });
        });
    }

    /**
     * Returns the initial window options provided during initialization.
     * @returns {TabWindowOptions} TabWindowOptions
     */
    public get initialWindowOptions(): TabWindowOptions {
        return this._initialWindowOptions;
    }
}
