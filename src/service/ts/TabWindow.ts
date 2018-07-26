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
		this._initialWindowOptions = await this.getWindowOptions();
		this._initialWindowBounds = await this.getWindowBounds();

		// @ts-ignore resizeRegion.sides is valid.  Its not in the type file.
		await this.updateWindowOptions({ frame: false, resizeRegion: { sides: { top: false } } });

		this._createWindowEventListeners();
	}

	public async hide() {
		return new Promise((res, rej) => {
			this._window.updateOptions(
				{
					opacity: 0
				},
				res,
				rej
			);
		});
	}

	public async show() {
		return new Promise((res, rej) => {
			this._window.updateOptions(
				{
					opacity: 1
				},
				res,
				rej
			);
		});
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
            this._window.moveTo(tabGroupBounds.left!, tabGroupBounds.top! + tabGroupBounds.height!, res, rej);
		});

		await new Promise((res, rej) => {
			this._window.joinGroup(groupWindow.finWindow, res, rej);
		});
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
			await this._tabGroup.window.minimizeGroup();
		}
	}

	private _onMaximize() {
		if (this._tab === this._tabGroup.activeTab) {
			this._tabGroup.window.maximizeGroup();
		}
	}

	private _onRestore() {
		if (this._tab === this._tabGroup.activeTab) {
			this._tabGroup.window.restoreGroup();
		} else {
			this._tabGroup.switchTab(this._tab.ID);
		}
	}

	private _onClose() {
		if (this._tab === this._tabGroup.activeTab) {
			this._tabGroup.removeTab(this._tab.ID, false);
		}
	}

	private _onFocus() {
		if (this._tab !== this._tabGroup.activeTab) {
			this._tabGroup.switchTab(this._tab.ID);
		}
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
