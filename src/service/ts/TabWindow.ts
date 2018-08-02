import { TabIndentifier } from "../../shared/types";
import { AsyncWindow } from "./asyncWindow";
import { Tab } from "./Tab";
import { TabGroup } from "./TabGroup";

export class TabWindow extends AsyncWindow {
	private _tab: Tab;
	private _tabGroup: TabGroup;
	private _initialWindowOptions: fin.WindowOptions = {};
	private _initialWindowBounds: fin.WindowBounds = {};

	constructor(tab: Tab, tabID: TabIndentifier) {
		super();
		this._tab = tab;
		this._tabGroup = tab.tabGroup;

		this._window = fin.desktop.Window.wrap(tabID.uuid, tabID.name);
	}

	async init() {
		[this._initialWindowOptions, this._initialWindowBounds] = await Promise.all([this.getWindowOptions(), this.getWindowBounds()]);

		// @ts-ignore resizeRegion.sides is valid.  Its not in the type file.
		this.updateWindowOptions({ frame: false, resizeRegion: { sides: { top: false } } });

		this._createWindowEventListeners();
	}

	public async hide() {
		return this.updateWindowOptions({
			opacity: 0
		});
	}

	public async show() {
		const state = await this.getState();

		if (state === "minimized") {
			this._window.restore();
		}

		this._window.updateOptions({
			opacity: 1
		});
	}

	async alignPositionToTabGroup() {
		const groupWindow = this._tab.tabGroup.window;
		const groupActiveTab = this._tab.tabGroup.activeTab;

		const tabGroupBoundsP = groupWindow.getWindowBounds();
		const tabBoundsP = groupActiveTab ? groupActiveTab.window.getWindowBounds() : this.getWindowBounds();

		const [tabGroupBounds, tabBounds] = await Promise.all([tabGroupBoundsP, tabBoundsP]);

		const resize = new Promise((res, rej) => {
			this._window.resizeTo(tabGroupBounds.width!, tabBounds.height!, "top-left", res, rej);
		});

		const moveTo = new Promise((res, rej) => {
			this._window.moveTo(tabGroupBounds.left!, tabGroupBounds.top! + tabGroupBounds.height!, res, rej);
		});

		await Promise.all([resize, moveTo]);

		// tslint:disable-next-line:no-unused-expression
		// new Promise((res, rej) => {
		this._window.joinGroup(groupWindow.finWindow);
		// });
	}

	protected _createWindowEventListeners() {
		// TODO: Add Window Close/minimize/maximize etc events.

		this._window.addEventListener("minimized", this._onMinimize.bind(this));

		this._window.addEventListener("maximized", this._onMaximize.bind(this));

		this._window.addEventListener("restored", this._onRestore.bind(this));

		this._window.addEventListener("closed", this._onClose.bind(this));

		this._window.addEventListener("focused", this._onFocus.bind(this));

		this._window.addEventListener("bounds-changed", this._onBoundsChanged.bind(this));
	}

	private async _onMinimize() {
		if (this._tab === this._tabGroup.activeTab) {
			this._tabGroup.window.minimizeGroup();
		}
	}

	private _onMaximize() {
		this._tabGroup.window.maximizeGroup();
	}

	private _onRestore() {
		if (this._tab === this._tabGroup.activeTab) {
			this._tabGroup.window.restoreGroup();
		} else {
			this._tabGroup.switchTab(this._tab.ID);
			this._tabGroup.window.restoreGroup();
		}
	}

	private _onClose() {
		this._tabGroup.removeTab(this._tab.ID, false, true);
	}

	private _onFocus() {
		if (this._tab !== this._tabGroup.activeTab) {
			this._tabGroup.switchTab(this._tab.ID);
		}

		this._tabGroup.window.finWindow.bringToFront();
	}

	private _onBoundsChanged() {
		if (this._tab === this._tabGroup.activeTab) {
			if (this._tabGroup.window.isMaximized) {
				console.log("in on bounds changed");
				this._tabGroup.window.restoreGroup();
			}
		}
	}

	get windowOptions() {
		return this._initialWindowOptions;
	}
}
