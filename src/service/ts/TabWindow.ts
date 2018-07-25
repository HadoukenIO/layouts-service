import { TabIndentifier } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { Tab } from "./Tab";

export class TabWindow extends AsyncWindow {
	private _tab: Tab;
	private _initialWindowOptions: fin.WindowOptions = {};
	private _initialWindowBounds: fin.WindowBounds = {};

	constructor(tab: Tab, tabID: TabIndentifier) {
		super();
		this._tab = tab;

		this._window = fin.desktop.Window.wrap(tabID.uuid, tabID.name);
	}

	async init() {
		this._initialWindowOptions = await this.getWindowOptions();
		this._initialWindowBounds = await this.getWindowBounds();

		// @ts-ignore resizeRegion.sides is valid.  Its not in the type file.
		await this.updateWindowOptions({ frame: false, resizeRegion: { sides: { top: false } } });
	}

	async alignPositionToTabGroup() {
		const groupWindow = this._tab.tabGroup.window;
		const groupActiveTab = this._tab.tabGroup.activeTab;

		const tabGroupBounds = await groupWindow.getWindowBounds();
		const tabBounds = await (groupActiveTab ? groupActiveTab.window.getWindowBounds() : this.getWindowBounds());

		await new Promise((res, rej) => {
			this._window.resizeTo(tabGroupBounds.width!, tabBounds.height!, "top-left", res, rej);
		});

		await new Promise((res, rej) => {
			this._window.moveTo(tabGroupBounds.width!, tabGroupBounds.top! + tabGroupBounds.height!, res, rej);
		});

		await new Promise((res, rej) => {
			this._window.joinGroup(groupWindow.finWindow, res, rej);
		});
	}

	private _createWindowEventListeners() {
		// TODO: Add Window Close/minimize/maximize etc events.
	}

	get windowOptions() {
		return this._initialWindowOptions;
	}
}
