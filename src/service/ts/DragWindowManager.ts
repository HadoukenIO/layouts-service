import { AsyncWindow } from "./asyncWindow";

export class DragWindowManager extends AsyncWindow {
	private static application = fin.desktop.Application.getCurrent();

	// tslint:disable-next-line:no-any
	private mouseTrackerInterval: any;

	// tslint:disable-next-line:no-any
	private _hideTimeout: any;

	constructor() {
		super();

		// this._setupListeners();
	}

	public async init() {
		console.log("in init");
		await this._createDragWindow();
	}

	public show(): void {
		this._window.show();

		this._hideTimeout = setTimeout(() => {
			this.hide();
		}, 15000);
	}

	public hide(): void {
		this._window.hide();
		clearTimeout(this._hideTimeout);
	}

	private _createDragWindow() {
		return new Promise((res, rej) => {
			this._window = new fin.desktop.Window(
				{
					name: "TabbingDragWindow",
					url: "http://localhost:9001/service/drag.html",
					defaultHeight: 1,
					defaultWidth: 1,
					defaultLeft: 0,
					defaultTop: 0,
					saveWindowState: false,
					autoShow: true,
					opacity: 0.01,
					frame: false,
					waitForPageLoad: false,
					alwaysOnTop: true,
					showTaskbarIcon: false,
					// @ts-ignore smallWidnow flag is valid
					smallWindow: true
				},
				() => {
					this._window.resizeTo(screen.width, screen.height, "top-left");
					this._window.hide();
					res();
				},
				rej
			);
		});
	}

	private _setWindowToMouse(set: boolean): void {
		if (set) {
			this.mouseTrackerInterval = setInterval(() => {
				fin.desktop.System.getMousePosition(mousePosition => {
					super._window.moveTo(mousePosition.left - 500, mousePosition.top - 500);
					fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, "tab-ping", { screenX: mousePosition.left, screenY: mousePosition.top });
				});
			}, 25);
		} else {
			clearInterval(this.mouseTrackerInterval);
		}
	}

	// private _setupListeners(): void {
	// 	fin.desktop.InterApplicationBus.subscribe(DragWindowManager.application.uuid, "DragManager:Hide", () => {
	// 		this.window.hide();
	// 	});

	// 	fin.desktop.InterApplicationBus.subscribe(DragWindowManager.application.uuid, "DragManager:Show", () => {
	// 		this.window.show();
	// 	});
	// }
}
