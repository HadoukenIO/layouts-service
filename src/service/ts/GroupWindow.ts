import { isNumber } from "util";
import { TabWindowOptions } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";
import { TabWindow } from "./TabWindow";

export class GroupWindow extends AsyncWindow {
	private _initialWindowOptions: TabWindowOptions;
	private _initialBounds: fin.WindowBounds = {};
	private _tabGroup: TabGroup;
	private _isMaximized: boolean = false;
	private _service: TabService = TabService.INSTANCE;

	constructor(windowOptions: TabWindowOptions, tabGroup: TabGroup) {
		super();
		this._tabGroup = tabGroup;

		const windowOptionsSanitized: TabWindowOptions = {
			url: windowOptions.url || "http://localhost:9001/tab-ui/",
			width: windowOptions.width && isNumber(windowOptions.width) ? windowOptions.width : undefined,
			height: windowOptions.height && isNumber(windowOptions.height) ? windowOptions.height : 62,
			screenX: windowOptions.screenX && isNumber(windowOptions.screenX) ? windowOptions.screenX : undefined,
			screenY: windowOptions.screenY && isNumber(windowOptions.screenY) ? windowOptions.screenY : undefined
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

	public async maximize() {
		console.log("in maximize");
		this._isMaximized = true;
		this._initialBounds = await this.getWindowBounds();

		this.moveTo(0, 0);

		this._window.resizeTo(screen.availWidth, this._tabGroup.initialWindowOptions.height!, "top-left");
		this._tabGroup.activeTab.window.resizeTo(screen.availWidth, screen.availHeight - this._tabGroup.initialWindowOptions.height!, "top-left");
	}

	public async restore() {
		console.log("in restore.  is maximized: ", this._isMaximized);
		if (this._isMaximized) {
			this._tabGroup.window.resizeTo(this._initialWindowOptions.width!, this._initialWindowOptions.height!, "top-left");
			this._tabGroup.window.moveTo(this._initialBounds.left!, this._initialBounds.top!);

			this._isMaximized = false;
		} else {
			this._window.restore();
		}
	}

	public async minimize() {
		const activeTabState = await this._tabGroup.activeTab.window.getState();
		if (activeTabState !== "minimized") {
			await Promise.all(
				this._tabGroup.tabs.map(tab => {
					return new Promise((res, rej) => {
						tab.window.finWindow.minimize(res, rej);
					});
				})
			);
		}

		this._window.minimize();
	}

	protected _createWindowEventListeners() {
		// TODO: Add Window Close/minimize/maximize etc events.

		this._window.addEventListener("minimized", this.minimize.bind(this));

		this._window.addEventListener("maximized", this.maximize.bind(this));

		this._window.addEventListener("restored", this.restore.bind(this));

		this._window.addEventListener("closed", this._onClose.bind(this));

		this._window.addEventListener("focused", this._onFocus.bind(this));
	}

	private async _onClose() {
		this._service.removeTabGroup(this._tabGroup.ID, true);
	}

	private _onFocus() {
		this._tabGroup.activeTab.window.finWindow.focus();
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
