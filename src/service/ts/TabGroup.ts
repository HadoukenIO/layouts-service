import { isNumber } from "util";
import { v4 as uuidv4 } from "uuid";
import { ServiceIABTopics, TabApiEvents, TabIndentifier, TabPackage, TabProperties, TabWindowOptions } from "../../shared/types";
import { GroupWindow } from "./GroupWindow";
import { Tab } from "./Tab";
import { TabService } from "./TabService";

export class TabGroup {
	readonly ID: string;

	private _window: GroupWindow;
	private _windowOptions!: TabWindowOptions;
	private _tabs: Tab[];
	private _activeTab!: Tab;

	constructor(windowOptions: TabWindowOptions) {
		this.ID = uuidv4();
		this._tabs = [];
		this._window = new GroupWindow(windowOptions, this);

		const windowOptionsSanitized: TabWindowOptions = {
			url: windowOptions.url || "http://localhost:9001/tab-ui/",
			width: windowOptions.width && isNumber(windowOptions.width) ? windowOptions.width : undefined,
			height: windowOptions.height && isNumber(windowOptions.height) ? windowOptions.height : 62,
			screenX: windowOptions.screenX && isNumber(windowOptions.screenX) ? windowOptions.screenX : undefined,
			screenY: windowOptions.screenY && isNumber(windowOptions.screenY) ? windowOptions.screenY : undefined
		};

		this._windowOptions = windowOptionsSanitized;
	}

	public async init(): Promise<void> {
		await this._window.init();
	}

	public initSettings(settings: { height: number }) {
		if (isNaN(settings.height)) {
			return;
		}
		this._windowOptions.height = settings.height;

		this._window.finWindow.resizeTo(this._windowOptions.width!, this._windowOptions.height, "top-left");
	}

	public async addTab(tabPackage: TabPackage): Promise<Tab> {
		const tab = new Tab(tabPackage, this);
		this._tabs.push(tab);
		await tab.init();

		if (this._tabs.length > 1) {
			tab.window.hide();
		} else {
			const tabOpts = await tab.window.getWindowOptions();

			if (tabOpts.opacity! === 0) {
				tab.window.show();
			}
		}

		return tab;
	}

	public async realignApps() {
		return Promise.all(
			this._tabs.map(tab => {
				tab.window.alignPositionToTabGroup();
			})
		);
	}

	public async deregisterTab(ID: TabIndentifier): Promise<void> {
		const tab = this.getTab(ID);

		await this.removeTab(ID, false, true);

		if (tab) {
			console.log("in if");
			tab.window.updateWindowOptions({ frame: true, opacity: 1.0 });
		}
	}

	public async removeTab(tabID: TabIndentifier, closeApp: boolean, closeGroupWindowCheck: boolean = false): Promise<void> {
		const index: number = this.getTabIndex(tabID);

		if (index === -1) {
			return;
		}
		const tabIndex = this._tabs[index];
		this._tabs.splice(index, 1);

		await tabIndex.remove(closeApp);

		if (closeGroupWindowCheck) {
			if (this._tabs.length === 0) {
				await TabService.INSTANCE.removeTabGroup(this.ID, true);
				return;
			}
		}

		if (this._tabs.length > 0) {
			await this.switchTab(null);
		}
	}

	public async switchTab(ID: TabIndentifier | null, hideActiveTab: boolean = true): Promise<void> {
		if (!ID) {
			ID = { uuid: this._tabs[0].ID.uuid, name: this._tabs[0].ID.name };
		}

		const tab = this.getTab(ID);

		if (tab && tab !== this._activeTab) {
			await tab.window.show();

			if (this._activeTab) {
				this._activeTab.window.hide();
			}

			tab.window.finWindow.bringToFront();

			this.setActiveTab(tab);
		}
	}

	public async removeAllTabs(closeApp: boolean): Promise<void[]> {
		// this._tabs.slice().forEach(async tab => {
		// 	await this.removeTab(tab.ID, closeApp);
		// });

		const refArray = this._tabs.slice();
		const refArrayMap = refArray.map(tab => {
			this.removeTab(tab.ID, closeApp);
		});

		return Promise.all(refArrayMap);
	}

	/**
	 * @public
	 * @function getTab Gets the tab with the specified identifier
	 * @param tabID The tab identifier
	 */
	public getTab(tabID: TabIndentifier): Tab | undefined {
		return this.tabs.find((tab: Tab) => {
			return tab.ID.uuid === tabID.uuid && tab.ID.name === tabID.uuid;
		});
	}

	public setActiveTab(tab: Tab): void {
		this._activeTab = tab;
		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this.ID, TabApiEvents.TABACTIVATED, tab.ID);
	}

	public getTabIndex(tabID: TabIndentifier): number {
		return this.tabs.findIndex((tab: Tab) => {
			return tab.ID.uuid === tabID.uuid && tab.ID.name === tabID.uuid;
		});
	}

	public get initialWindowOptions(): TabWindowOptions {
		return this._windowOptions;
	}

	public get activeTab(): Tab {
		return this._activeTab;
	}

	public get window(): GroupWindow {
		return this._window;
	}

	public get tabs(): Tab[] {
		return this._tabs;
	}
}
