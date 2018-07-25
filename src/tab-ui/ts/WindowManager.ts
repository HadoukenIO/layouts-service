import { TabIndentifier } from "../../shared/types";
import { TabManager } from "./TabManager";
/**
 * WindowManager contains methods for handling the Tab Window.
 */
export class WindowManager {
	/**
	 * The height of the tab window, with tabs.
	 */
	public static designatedHeightWithTabs: number = 62;

	/**
	 * The height of the tab window, with tabs.
	 */
	public static designatedHeightWithoutTabs: number = 62;

	/**
	 * Global instance of the WindowManager class.
	 */
	private static INSTANCE: WindowManager;

	/**
	 * Holds the timeout for recent drag over events.  Required to check if the window has recently
	 * been dragged over to enable drag blocks.
	 */
	private dragOverChecker!: number | null;

	/**
	 * Reference of the tab openfin window.
	 */
	private window!: fin.OpenFinWindow;

	/**
	 * Check if we received a drop event on the window.
	 */
	private didGetDrop: boolean = false;

	private isMaximized: boolean = false;

	private beforeMaximizedBounds: fin.WindowBounds | null = null;

	/**
	 * Singleton
	 * @constructor
	 */
	constructor() {
		// If we already have an instance return that and exit.
		if (WindowManager.INSTANCE) {
			return WindowManager.INSTANCE;
		}

		this.window = fin.desktop.Window.getCurrent();
		this._setupListeners();

		// Set the instance if no exit.
		WindowManager.INSTANCE = this;
	}

	/**
	 * Exits the tab window and closes all tabs.
	 */
	public exit(): void {
		// Close + Remove all tabs.
		TabManager.instance.removeAllTabs();

		// Force close the tab window.
		this.window.close(true);
	}

	/**
	 * Minimizes the tab Window and active tab.
	 */
	public minimize(): void {
		TabManager.instance.getActiveTab!.getExternalApplication.getWindow.minimize();

		// Minimize tab window.
		this.window.minimize();
	}

	/**
	 * Maximize the tab window and active tab.
	 */
	public maximize(): void {
		// Note that when we "maximze" we are not in a true maximized state, because we are working with 2 windows.

		// Get bounds of the current window.
		TabManager.instance.getActiveTab!.getExternalApplication.getWindow.getBounds(bounds => {
			// Store current bounds before maximization, for restore.
			this.beforeMaximizedBounds = bounds;

			// Move the tab strip to 0,0
			this.window.moveTo(0, 0);

			// Resize to width of full screen.
			this.window.resizeTo(screen.availWidth, WindowManager.designatedHeightWithTabs, "top-left");

			// Resize app to full screen height - tab window height.
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.resizeTo(screen.availWidth, screen.availHeight - WindowManager.designatedHeightWithTabs, "top-left");

			// Flag tracking for is we are maximized.
			this.setIsMaximized = true;
		});
	}

	/**
	 * Restores the window from a "maximized" state.
	 */
	public restore(): void {
		if (this.beforeMaximizedBounds && this.isMaximized) {
			this.setIsMaximized = false;
			const tabWindow = TabManager.instance.getActiveTab.getExternalApplication.getWindow;
			tabWindow.resizeTo(this.beforeMaximizedBounds.width!, this.beforeMaximizedBounds.height!, "top-left");
			tabWindow.moveTo(this.beforeMaximizedBounds.left!, this.beforeMaximizedBounds.top!);
		}
	}

	/**
	 * Maximizes if not maximized.  Restores if maximized.
	 */
	public toggleMaximize(): void {
		if (this.isMaximized) {
			this.restore();
		} else {
			this.maximize();
		}
	}

	/**
	 * Align the tab window to an application windows position.
	 * @param extWindow {fin.OpenFinWindow} Window to align tab window to.
	 */
	public async centerTabWindow(extWindow: fin.OpenFinWindow) {
		extWindow.getBounds((bounds: fin.WindowBounds) => {
			// Move tab window to application window.
			this.window.moveTo(bounds.left!, bounds.top! - WindowManager.designatedHeightWithTabs);

			// Resize tab window to application window width, keep default tab window height.
			this.window.resizeTo(bounds.width!, WindowManager.designatedHeightWithTabs, "top-left");

			// Join the tab window group for easy movement correlation.
			extWindow.joinGroup(this.window);
		});
	}

	/**
	 * Enables the drag block div.  Required to accept drop effects in the window movement area.
	 */
	public setDragBlock(): void {
		document.getElementById("drag-shield")!.style.display = "block";
	}

	/**
	 * Disables the drag block div.  Required to restore window movement.
	 */
	public unsetDragBlock(): void {
		document.getElementById("drag-shield")!.style.display = "none";
	}

	/**
	 * Creates various event listeners for drag and drop, window close events.
	 */
	private _setupListeners(): void {
		// If the monitor changes size we need to realign the apps otherwise the are misaligned.
		fin.desktop.System.addEventListener("monitor-info-changed", TabManager.instance.realignApps.bind(TabManager.instance));

		// Responds to the add-tab IAB message.  Adds a tab.
		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "add-tab", (message: TabIndentifier) => {
			TabManager.instance.addTab(message);
		});

		// Fires when a tab is being dragged and is over our window.
		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "tab-ping-over", this._onDragOver.bind(this));

		// Fires when our tab window is minimized.
		this.window.addEventListener("minimized", () => {
			// Minimize active tab.
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.minimize();
		});

		// Fires when our tab window is restored.
		this.window.addEventListener("restored", () => {
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.restore();
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.focus();
		});

		// If the window is trying to close, call exit route to close all tabs.
		fin.desktop.Window.getCurrent().addEventListener("close-requested", () => {
			this.exit();
		});
	}

	/**
	 * Fires when a tab is being dragged and is over our window.
	 */
	private _onDragOver(): void {
		// Currently does nothng.
	}

	/**
	 * Returns the tab openfin window.
	 * @returns {fin.openfinWindow}
	 */
	public get getWindow(): fin.OpenFinWindow {
		return this.window;
	}

	/**
	 * Sets the didGetDrop property.
	 * @param didDrop {boolean} Did we get a drop?
	 */
	public set setDidGetDrop(didDrop: boolean) {
		this.didGetDrop = didDrop;
	}

	/**
	 * Returns didGetDrop property.
	 * @returns {boolean} didGetDrop
	 */
	public get getDidGetDrop(): boolean {
		return this.didGetDrop;
	}

	public set setIsMaximized(maximized: boolean) {
		this.isMaximized = maximized;
	}

	/**
	 * Returns the WindowManager instance.
	 * @returns {WindowManager} WindowManager
	 */
	public static get instance(): WindowManager {
		if (WindowManager.INSTANCE) {
			return WindowManager.INSTANCE;
		} else {
			return new WindowManager();
		}
	}
}
