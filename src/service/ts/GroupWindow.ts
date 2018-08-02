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

	public async init(): Promise<void> {
		this._window = await this._createTabWindow();
		this._createWindowEventListeners();
	}

	public async alignPositionToApp(app: TabWindow): Promise<void> {
		const win: fin.OpenFinWindow = app.finWindow;
		const bounds = await app.getWindowBounds();

		const resizeTo = this._window.resizeTo(bounds.width!, this._initialWindowOptions.height!, "top-left");

		const moveTo = this._window.moveTo(bounds.left!, bounds.top! - this._initialWindowOptions.height!);

		await Promise.all([resizeTo, moveTo]);
		win.joinGroup(this._window!);
	}

	public async toggleMaximize() {
		if (this._isMaximized) {
			this.restoreGroup();
		} else {
			this.maximizeGroup();
		}
	}

	public async maximizeGroup(): Promise<void> {
		this._beforeMaximizeBounds = await this._tabGroup.activeTab.window.getWindowBounds();

		const moveto = this.moveTo(0, 0);
		const tabresizeto = this._tabGroup.activeTab.window.resizeTo(screen.availWidth, screen.availHeight - this._tabGroup.initialWindowOptions.height!, "top-left");

		await Promise.all([moveto, tabresizeto]);

		this._isMaximized = true;
	}

	public async restoreGroup() {
		if (this._isMaximized) {
			if ((await this.getState()) === "minimized") {
				this._window.restore();
				return;
			} else {
				const resize = this._tabGroup.activeTab.window.resizeTo(this._beforeMaximizeBounds.width!, this._beforeMaximizeBounds.height!, "top-left");
				const moveto = this._tabGroup.window.moveTo(this._beforeMaximizeBounds.left!, this._beforeMaximizeBounds.top!);
				this._isMaximized = false;
				return Promise.all([resize, moveto]);
			}
		} else {
			return new Promise((res, rej) => {
				this._window.restore(res, rej);
			});
		}
	}

	public async minimizeGroup() {
		const minWins = this._tabGroup.tabs.map(tab => {
			return new Promise((res, rej) => {
				tab.window.finWindow.minimize(res, rej);
			});
		});

		const group = new Promise((res, rej) => {
			this._window.minimize(res, rej);
		});

		return Promise.all([minWins, group]);
	}

	public async closeGroup(): Promise<void> {
		return this._service.removeTabGroup(this._tabGroup.ID, true);
	}

	protected _createWindowEventListeners(): void {
		this._window.addEventListener("focused", () => {
			this._tabGroup.activeTab.window.finWindow.bringToFront();
		});
	}

	public get isMaximized(): boolean {
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
