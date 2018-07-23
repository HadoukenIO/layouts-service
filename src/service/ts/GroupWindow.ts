import { isNumber } from "util";
import { TabWindowOptions } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { TabGroup } from "./TabGroup";
import { TabWindow } from "./TabWindow";

export class GroupWindow extends AsyncWindow {
	private _initialWindowOptions: TabWindowOptions;
	private _initialBounds: fin.WindowBounds = {};
	private _tabGroup: TabGroup;

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
	}

	public async alignPositionToApp(app: TabWindow) {
		const win: fin.OpenFinWindow = app.finWindow;
		const bounds = await app.getWindowBounds();

		await new Promise((res, rej) => {
			this._window.resizeTo(bounds.width!, this._initialWindowOptions.height!, "top-left", res, rej);
		});

		await new Promise((res, rej) => {
			this._window.moveTo(bounds.left!, bounds.top! - this._initialWindowOptions.height!, res, rej);
		});

		await new Promise((res, rej) => {
			win.joinGroup(this._window!, res, rej);
		});
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
