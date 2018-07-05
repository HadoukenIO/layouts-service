import { EjectTriggers } from "../../shared/types";
import { TabOptions } from "../../tab-ui/ts/Tab";
import { DragWindowManager } from "./DragWindowManager";

export interface IsOverWindowResult {
	result: boolean;
	window?: fin.OpenFinWindow | null;
}

export class Service {
	private dragWindowManager: DragWindowManager = new DragWindowManager();

	constructor() {
		this._setupListeners();
	}

	private _setupListeners(): void {
		this._discoverRunningApplications();

		fin.desktop.System.addEventListener("application-started", this._onApplicationCreated.bind(this));

		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "tab-ping", async (message, uuid, name) => {
			const res: IsOverWindowResult = await this._isOverTabWindow(message.screenX, message.screenY);

			if (res.result && res.window) {
				fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, res.window.name, "tab-ping-over", {});
			}
		});

		fin.desktop.InterApplicationBus.subscribe(fin.desktop.Application.getCurrent().uuid, "tab-ejected", async (message, uuid, name) => {
			console.log(message);
			if (message.uuid && message.name && message.screenX && message.screenY && message.trigger) {
				const res: IsOverWindowResult = await this._isOverTabWindow(message.screenX, message.screenY);

				if (res.result && res.window && message.trigger === EjectTriggers.DRAG) {
					fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, res.window.name, "add-tab", message);
				} else {
					this._createTabWindow(message.uuid, message.name, { alignTabWindow: true }, message.screenX, message.screenY);
				}
			}
		});

		fin.desktop.Window.getCurrent().addEventListener("close-requested", () => {
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
		});
	}

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

	private _onApplicationCreated(event: fin.SystemBaseEvent): void {
		const app = fin.desktop.Application.wrap(event.uuid);
		this._addTabsToApplication(app);
	}

	private _createTabWindow(uuid: string, name: string, options: TabOptions = {}, screenX: number | null = null, screenY: number | null = null) {
		const tabWindow: fin.OpenFinWindow = new fin.desktop.Window({
			name: `${Math.random() * 10000}`,
			url: "http://localhost:9001/tab-ui/",
			customData: JSON.stringify({ name, uuid, ...options }),
			autoShow: true,
			frame: false,
			maximizable: false,
			resizable: false,
			defaultHeight: 62,
			defaultLeft: screenX ? screenX : 100,
			defaultTop: screenY ? screenY : 100,
			saveWindowState: false
		});
	}
}
