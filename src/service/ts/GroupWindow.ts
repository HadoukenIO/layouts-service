import { TabWindowOptions } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";
import { TabWindow } from "./TabWindow";

export class GroupWindow extends AsyncWindow {
	private _initialWindowOptions: TabWindowOptions;
	private _initialBounds: fin.WindowBounds = {};
	private _beforeMaximizeBounds: fin.WindowBounds = {};
	private _tabGroup: TabGroup;
	private _isMaximized: boolean = false;
	private _service: TabService = TabService.INSTANCE;

	constructor(windowOptions: TabWindowOptions, tabGroup: TabGroup) {
		super();
		this._tabGroup = tabGroup;

		const windowOptionsSanitized: TabWindowOptions = {
			url: windowOptions.url || "http://localhost:9001/tab-ui/",
			width: windowOptions.width && !isNaN(windowOptions.width) ? windowOptions.width : undefined,
			height: windowOptions.height && !isNaN(windowOptions.height) ? windowOptions.height : 62,
			screenX: windowOptions.screenX && !isNaN(windowOptions.screenX) ? windowOptions.screenX : undefined,
			screenY: windowOptions.screenY && !isNaN(windowOptions.screenY) ? windowOptions.screenY : undefined
		};

		this._initialWindowOptions = windowOptionsSanitized;
	}

	public async init() {
		this._window = await this._createTabWindow();
		this._createWindowEventListeners();
	}

	public async alignPositionToApp(app: TabWindow) {
		const win: fin.OpenFinWindow = app.finWindow;
		const bounds = await app.getWindowBounds();

		await this._window.resizeTo(bounds.width!, this._initialWindowOptions.height!, "top-left");

		await this._window.moveTo(bounds.left!, bounds.top! - this._initialWindowOptions.height!);

		await new Promise((res, rej) => {
			win.joinGroup(this._window!, res, rej);
		});
	}

	public async maximizeGroup() {
		this._beforeMaximizeBounds = await this._tabGroup.activeTab.window.getWindowBounds();

		const moveto = this.moveTo(0, 0);
		const tabresizeto = this._tabGroup.activeTab.window.resizeTo(screen.availWidth, screen.availHeight - this._tabGroup.initialWindowOptions.height!, "top-left");

		await Promise.all([moveto, tabresizeto]);

		this._isMaximized = true;
	}

	public async restoreGroup() {
		if (this._isMaximized) {
			const resize = this._tabGroup.activeTab.window.resizeTo(this._beforeMaximizeBounds.width!, this._beforeMaximizeBounds.height!, "top-left");
			const moveto = this._tabGroup.window.moveTo(this._beforeMaximizeBounds.left!, this._beforeMaximizeBounds.top!);

			await Promise.all([resize, moveto]);

			this._isMaximized = false;
		} else {
			await this._window.restore();
		}
	}

	public async minimizeGroup() {
		const activetab = new Promise(async (res, rej) => {
			if ((await this._tabGroup.activeTab.window.getState()) !== "minimized") {
				this._tabGroup.activeTab.window.finWindow.minimize(res, rej);
			} else {
				res();
			}
		});

		const group = new Promise((res, rej) => {
			this._window.minimize(res, rej);
		});

		await Promise.all([activetab, group]);
	}

	public async closeGroup() {
		await this._service.removeTabGroup(this._tabGroup.ID, true);
	}

	protected _createWindowEventListeners() {
		this._window.addEventListener("focused", () => {
			this._tabGroup.activeTab.window.finWindow.bringToFront();
		});
	}

	public get isMaximized() {
		return this._isMaximized;
	}

	public set isMaximized(maximized: boolean) {
		this._isMaximized = maximized;
	}

	private async _createTabWindow(): Promise<fin.OpenFinWindow> {
		// @ts-ignore TS complains, but verified this is real and working.
		return new Promise((res, rej) => {
			const win = new fin.desktop.Window(
				{
					name: this._tabGroup.ID,
					url: this._initialWindowOptions.url,
					autoShow: false,
					frame: false,
					maximizable: false,
					resizable: false,
					defaultHeight: this._initialWindowOptions.height,
					defaultWidth: this._initialWindowOptions.width,
					defaultLeft: this._initialWindowOptions.screenX,
					defaultTop: this._initialWindowOptions.screenY,
					defaultCentered: !this._initialWindowOptions.screenX && !this._initialWindowOptions.screenY,
					saveWindowState: false
				},
				() => {
					res(win);
				},
				e => {
					rej(e);
				}
			);
		});
	}
}
