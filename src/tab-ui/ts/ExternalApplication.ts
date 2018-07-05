import { TabIndentifier } from "../../shared/types";
import { Tab, TabOptions } from "./Tab";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";
/**
 * ExternalApplication contains methods for handling the actual application operations of the tab.
 */
export class ExternalApplication {
	/**
	 * Instance of the attached application.
	 */
	private application: fin.OpenFinApplication;

	/**
	 * Instance of the attached application window.
	 */
	private window: fin.OpenFinWindow;

	/**
	 * Instance of the corresponding Tab UI.
	 */
	private tab: Tab;

	private snapshot: string = "";

	private windowOptions!: fin.WindowOptions;

	private initialBounds!: fin.WindowBounds;
	/**
	 * @constructor
	 * @param tabID {Object} UUID, Name of the Application, Window, + Tab Options.
	 * @param tab Reference to the corresponding Tab UI.
	 */
	constructor(tabID: TabIndentifier & TabOptions, tab: Tab) {
		this.application = fin.desktop.Application.wrap(tabID.uuid);
		this.window = fin.desktop.Window.wrap(tabID.uuid, tabID.name);
		this.tab = tab;

		this.setWindowOptions().then(opts => {
			tab.updateIcon(opts.icon && opts.icon!.length > 0 ? opts.icon! : `https://www.google.com/s2/favicons?domain=${opts.url}`);
		});

		this.window.getBounds(bounds => {
			this.initialBounds = bounds;
		});

		this.window.getState(state => {
			if (state === "maximized") {
				WindowManager.instance.maximize();
			}
		});

		// Set the application window to frameless and remove resize options on its top.
		this.window.updateOptions({
			frame: false,
			// @ts-ignore ResizeRegion.sides is valid.
			resizeRegion: { sides: { top: false } }
		});

		this._setupListeners();

		// If this is the first tab, we center the tab window to the application location.
		// Otherwise we move the app window to the tab window.
		if (TabManager.instance.getTabs.length === 0 && !tabID.alignTabWindow) {
			WindowManager.instance.centerTabWindow(this.window);
		} else {
			this.alignAppWindow();
		}
		this.window.getSnapshot(snapshot => {
			this.snapshot = `data:image/png;base64,${snapshot}`;
		});
		setInterval(() => {
			this.window.getSnapshot(snapshot => {
				this.snapshot = `data:image/png;base64,${snapshot}`;
			});
		}, 5000);
	}

	/**
	 * Hides the application window.
	 */
	public hide(): void {
		// We set the opacity to 0 then minimize.  This is to avoid seeing the "minimize" visual cues.
		this.window.updateOptions({ opacity: 0 }, () => {
			this.window.minimize();
		});
	}

	/**
	 * Shows the application window.
	 */
	public show(): void {
		// We restore the window from minimized state, then return opacity + focus.  This is to avoid restore visual cues.
		this.window.restore(() => {
			this.window.updateOptions({ opacity: 1 });
			this.window.focus();
		});
	}

	/**
	 * Aligns the application window to the current position of the tab window.
	 */
	public alignAppWindow(): void {
		// Leaves group if in one to allow free window movement.
		this.window.leaveGroup();

		WindowManager.instance.getWindow.getBounds((bounds: fin.WindowBounds) => {
			// Move application window to tab window position + tab window height offset.
			this.window.moveTo(bounds.left!, bounds.top! + WindowManager.designatedHeightWithTabs);

			this.window.getBounds((extBounds: fin.WindowBounds) => {
				// Set to tab window width & keep application height.

				if (TabManager.instance.getLastActiveTab) {
					TabManager.instance.getLastActiveTab.getExternalApplication.getWindow.getBounds(activeTabBounds => {
						this.window.resizeTo(bounds.width!, activeTabBounds.height!, "top-left");
					});
				} else {
					this.window.resizeTo(bounds.width!, extBounds.height!, "top-left");
				}

				// Join the tab window group for easy movement correlation.
				this.window.joinGroup(WindowManager.instance.getWindow);
			});
		});
	}

	public async setWindowOptions(): Promise<fin.WindowOptions> {
		return new Promise<fin.WindowOptions>((res, rej) => {
			this.window.getOptions(options => {
				this.windowOptions = options;
				res(options);
			});
		});
	}

	/**
	 * Creates various event listeners for state tracking of the application.
	 */
	private _setupListeners(): void {
		this.window.addEventListener("focused", this._onWindowFocus.bind(this));
		this.window.addEventListener("restored", this._onWindowRestore.bind(this));
		this.window.addEventListener("closed", this._onWindowClosed.bind(this));
		this.window.addEventListener("minimized", this._onWindowMinimize.bind(this));
		this.window.addEventListener("maximized", WindowManager.instance.maximize.bind(WindowManager.instance));
	}

	/**
	 * Handles when the application window is minimized.
	 */
	private _onWindowMinimize(): void {
		// If the application window is the active tab, then we force the tab window to minimize as well.
		// All other tabs will be in minimized state naturally.
		if (this.tab === TabManager.instance.getActiveTab) {
			WindowManager.instance.minimize();
		}
	}

	/**
	 * Handles when the application window is restored.
	 * @param e {fin.WindowBaseEvent} fin.WindowBaseEvent
	 */
	private _onWindowRestore(e: fin.WindowBaseEvent): void {
		// Sets the restored window as the active tab, in case of taskbar restore.
		TabManager.instance.setActiveTab({ name: e.name, uuid: e.uuid });

		// Then we restore the tab window.
		WindowManager.instance.getWindow.restore();
	}

	/**
	 * Handles when the application window is closed.
	 */
	private _onWindowClosed(): void {
		// Remove the tab from the tab window.
		TabManager.instance.removeTab(this.tab.getTabId);
	}

	/**
	 * Handles when the application window is focused.
	 */
	private _onWindowFocus(): void {
		// Bring the tab window into view to avoid missing tabs.
		WindowManager.instance.getWindow.bringToFront();
	}

	/**
	 * Returns the Application.
	 * @returns {fin.OpenFinApplication} fin.OpenfinApplication
	 */
	public get getApplication(): fin.OpenFinApplication {
		return this.application;
	}

	public get getWindowOptions(): fin.WindowOptions {
		return this.windowOptions;
	}

	public get getInitialBounds(): fin.WindowBounds {
		return this.initialBounds;
	}

	/**
	 * Returns the Application Window.
	 * @returns {fin.OpenFinWindow} fin.OpenfinWindow
	 */
	public get getWindow(): fin.OpenFinWindow {
		return this.window;
	}

	public get getSnapshot(): string {
		return this.snapshot;
	}
}
