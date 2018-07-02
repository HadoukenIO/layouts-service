import { TabIndentifier } from "./Tab";
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
	 * TODO
	 */
	public maximize(): void {
		TabManager.instance.getActiveTab!.getExternalApplication.getWindow.getBounds(bounds => {
			this.beforeMaximizedBounds = bounds;

			this.window.moveTo(0, 0);
			this.window.resizeTo(screen.availWidth, WindowManager.designatedHeightWithTabs, "top-left");
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.resizeTo(screen.availWidth, screen.availHeight - WindowManager.designatedHeightWithTabs, "top-left");

			this.setIsMaximized = true;
		});
	}

	public restore(): void {
		if (this.beforeMaximizedBounds) {
			const tabWindow = TabManager.instance.getActiveTab.getExternalApplication.getWindow;
			tabWindow.resizeTo(this.beforeMaximizedBounds.width!, this.beforeMaximizedBounds.height!, "top-left");
			tabWindow.moveTo(this.beforeMaximizedBounds.left!, this.beforeMaximizedBounds.top!);
			this.setIsMaximized = false;
		}
	}

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
	public centerTabWindow(extWindow: fin.OpenFinWindow): void {
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
		// document.addEventListener("dragover", this._onDragOver.bind(this), false);
		// document.addEventListener("dragleave", this._onDragLeave.bind(this), false);
		// document.addEventListener("drop", this._onDragDrop.bind(this), false);

		fin.desktop.System.addEventListener("monitor-info-changed", TabManager.instance.realignApps.bind(TabManager.instance));

		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "add-tab", (message: TabIndentifier) => {
			TabManager.instance.addTab(message);
		});

		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "tab-ping-over", this._onDragOver.bind(this));

		this.window.addEventListener("minimized", () => {
			// Minimize active tab.
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.minimize();
		});

		this.window.addEventListener("restored", () => {
			// Minimize active tab.
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.restore();
			TabManager.instance.getActiveTab!.getExternalApplication.getWindow.focus();
		});

		// If the window is trying to close, call exit route to close all tabs.
		fin.desktop.Window.getCurrent().addEventListener("close-requested", () => {
			this.exit();
		});
	}

	// /**
	//  * Handles when the drag event has left the window.
	//  * @param e {DragEvent} HTML5 Drag Event
	//  */
	// private _onDragLeave(e: DragEvent) {
	// 	// Clear any existing dragover timeouts.
	// 	// @ts-ignore Timeout type confusion.
	// 	clearTimeout(this.dragOverChecker);

	// 	// If we don't receive a dragOver event in 200ms then assume we are not dragging over our window anymore,
	// 	// reenable normal window movement dragging.
	// 	// @ts-ignore Timeout type confusion.
	// 	this.dragOverChecker = setTimeout(() => {
	// 		this.unsetDragBlock();
	// 		this.dragOverChecker = null;
	// 	}, 200);
	// }

	private _onDragOver(): void {
		// @ts-ignore
		// clearTimeout(this.dragOverChecker);
		// this.dragOverChecker = setTimeout(() => {
		// 	//
		// }, 100);
	}
	// /**
	//  * Handles when a drag event is over the window.
	//  * @param e {DragEvent} HTML5 DragEvent
	//  */
	// private _onDragOver(e: DragEvent) {
	// 	if (e.preventDefault) {
	// 		e.preventDefault(); // Necessary. Allows us to drop.
	// 	}

	// 	// If we have triggered a drag leave event at any time already, clear it.
	// 	if (this.dragOverChecker) {
	// 		clearTimeout(this.dragOverChecker);
	// 		this.dragOverChecker = null;
	// 	}

	// 	// // How do we handle the drop effect type?
	// 	// e.dataTransfer.dropEffect = "move";

	// 	// // Enable window drag movement blocks.
	// 	// this.setDragBlock();

	// 	// return false;
	// }

	// /**
	//  * Handles when drag drop event has occurred on the window.
	//  * @param e {DragEvent} HTML5 DragEvent
	//  */
	// private _onDragDrop(e: DragEvent) {
	// 	if (e.stopPropagation) {
	// 		e.stopPropagation(); // stops the browser from redirecting.
	// 	}

	// 	// There is nothing being dragged, so disable drag block to restore window movement.
	// 	this.unsetDragBlock();

	// 	// We did get a drop event.  Required check for tab manipulation.
	// 	this.setDidGetDrop = true;

	// 	// Add the tab we received via drop.
	// 	if (e.dataTransfer.getData("text/plain")) {
	// 		TabManager.instance.addTab(JSON.parse(e.dataTransfer.getData("text/plain")));
	// 	}

	// 	return false;
	// }

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
