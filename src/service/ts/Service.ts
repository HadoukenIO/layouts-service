import { EjectTriggers, TabEjectEvent, TabOptions } from "../../shared/types";
import { DragWindowManager } from "./DragWindowManager";

export interface IsOverWindowResult {
	result: boolean;
	window?: fin.OpenFinWindow | null;
}

/**
 * The base service class.
 */
export class Service {
	private dragWindowManager: DragWindowManager = new DragWindowManager();

	constructor() {
		this._setupListeners();
	}

	/**
	 * Creates listeners for IAB events.
	 */
	private _setupListeners(): void {
		this._discoverRunningApplications();

		// Fired when any application is started: We add a tab window to it.
		fin.desktop.System.addEventListener("application-started", this._onApplicationCreated.bind(this));

		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "tab-ping", this._onTabPing.bind(this));

		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "tab-ejected", this._onTabEjected.bind(this));

		fin.desktop.Window.getCurrent().addEventListener("close-requested", this._onCloseRequested.bind(this));
	}

	/**
	 * Handles when the service is attempting to close.
	 */
	private _onCloseRequested() {
		const app = fin.desktop.Application.getCurrent();

		const closeFn = (window: fin.OpenFinWindow) => {
			return new Promise<void>((res, rej) => {
				window.close(false, () => {
					res();
				});
			});
		};

		let actions = [];

		app.getChildWindows(
			(children: fin.OpenFinWindow[]): void => {
				actions = children.map(closeFn);
				const results = Promise.all(actions);

				results.then(() => {
					fin.desktop.Window.getCurrent().close(true);
				});
			}
		);
	}

	/**
	 * Handles TabPings from when a tab is being hovered around.
	 * @param message {screenX, screenY}
	 */
	private async _onTabPing(message: { screenX: number; screenY: number }) {
		const res: IsOverWindowResult = await this._isOverTabWindow(message.screenX, message.screenY);

		if (res.result && res.window) {
			fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, res.window.name, "tab-ping-over", {});
		}
	}

	/**
	 * Handles when a tab has been ejected from a tab window.
	 * @param message TabEjectedEvent
	 */
	private async _onTabEjected(message: TabEjectEvent) {
		if (message.uuid && message.name && message.screenX && message.screenY && message.trigger) {
			const res: IsOverWindowResult = await this._isOverTabWindow(message.screenX, message.screenY);

			if (res.result && res.window && message.trigger === EjectTriggers.DRAG) {
				fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, res.window.name, "add-tab", message);
			} else {
				this._createTabWindow(message.uuid, message.name, { alignTabWindow: true }, message.screenX, message.screenY, message.width);
			}
		}
	}

	/**
	 * Checks if a tab is over any of our windows when it is being hovered.
	 * @param x X Coordinate of the hover on screen.
	 * @param y Y Coordinate of the hover on screen.
	 */
	private async _isOverTabWindow(x: number, y: number): Promise<IsOverWindowResult> {
		return new Promise<IsOverWindowResult>((res, rej) => {
			fin.desktop.Application.getCurrent().getChildWindows(children => {
				let hasFound: boolean = false;
				let win = null;
				const dragWindowName = this.dragWindowManager.getWindow.name;

				for (const window of children) {
					const winNative = window.getNativeWindow();
					const winX: number = winNative.screenX;
					const winY: number = winNative.screenY;
					const winWidth: number = winNative.outerWidth;
					const winHeight: number = winNative.outerHeight;

					if (x > winX && x < winX + winWidth && y > winY && y < winY + winHeight && !hasFound && dragWindowName !== window.name) {
						hasFound = true;
						win = window;
						break;
					}
				}

				res({ result: hasFound, window: win });
			});
		});
	}

	/**
	 * Discovers any running applications prior to the service being launched.
	 * And adds a tab UI to them.
	 */
	private _discoverRunningApplications(): void {
		fin.desktop.System.getAllApplications(
			(applicationInfoList: fin.ApplicationInfo[]): void => {
				applicationInfoList.forEach(
					(app: fin.ApplicationInfo): void => {
						if (app.isRunning && app.uuid !== fin.desktop.Application.getCurrent().uuid) {
							const application = fin.desktop.Application.wrap(app.uuid!);
							this._addTabsToApplication(application);
						}
					}
				);
			}
		);
	}

	/**
	 * Adds a tab UI to applicaiton and all of its child windows.
	 * @param app Openfin Applicaiton
	 */
	private _addTabsToApplication(app: fin.OpenFinApplication): void {
		const appMainWindow = app.getWindow();

		// @ts-ignore TS doesnt think uuid is on the window object, but it is.
		this._createTabWindow(appMainWindow.uuid, appMainWindow.name);

		app.getChildWindows(
			(children: fin.OpenFinWindow[]): void => {
				children.forEach(
					(childWindow: fin.OpenFinWindow): void => {
						this._createTabWindow(app.uuid!, childWindow.name);
					}
				);
			}
		);

		// @ts-ignore TS complains about the event type for the following.
		app.addEventListener("window-created", (event: fin.WindowEvent) => {
			this._createTabWindow(event.uuid, event.name);
		});
	}

	/**
	 * Handles when a new applicaiton is created.  Adds a tab UI to it.
	 * @param event
	 */
	private _onApplicationCreated(event: fin.SystemBaseEvent): void {
		const app = fin.desktop.Application.wrap(event.uuid);
		this._addTabsToApplication(app);
	}

	/**
	 * Adds a tab UI to any window.
	 * @param uuid UUID of the Window
	 * @param name Name of the Window.
	 * @param options Optional. Any special options needed for creation. Default none.
	 * @param screenX Optional. The screen X coord to create the tab window at.
	 * @param screenY Optional. The screen Y coord to create the tab window at.
	 * @param width Optional.  The width of the window once it is created.
	 */
	private _createTabWindow(uuid: string, name: string, options: TabOptions = {}, screenX: number | null = null, screenY: number = 100, width: number | null = null) {
		const tabWindow: fin.OpenFinWindow = new fin.desktop.Window({
			name: `${Math.random() * 10000}`,
			url: "http://localhost:9001/tab-ui/",
			customData: JSON.stringify({ name, uuid, ...options }),
			autoShow: true,
			frame: false,
			maximizable: false,
			resizable: false,
			defaultHeight: 62,
			defaultWidth: width ? width : undefined,
			defaultLeft: screenX ? screenX : 100,
			defaultTop: screenY ? screenY : 100,
			saveWindowState: false
		});
	}
}
