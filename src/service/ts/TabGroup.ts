import { isNumber } from "util";
import { v4 as uuidv4 } from "uuid";
import { ClientUIIABTopics, ServiceIABTopics, TabIndentifier, TabPackage, TabProperties, TabWindowOptions } from "../../shared/types";
import { GroupWindow } from "./GroupWindow";
import { Tab } from "./Tab";

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

	public async init() {
		await this._window.init();
	}

	public async addTab(tabPackage: TabPackage) {
		const tab = new Tab(tabPackage, this);
		this._tabs.push(tab);
		await tab.init();

		if (this._tabs.length > 1) {
			tab.window.hide();
		}

		return tab;
	}

	public async realignApps(): Promise<void> {
		await Promise.all(
			this._tabs.map(tab => {
				tab.window.alignPositionToTabGroup();
			})
		);
	}

	public async deregisterTab(ID: TabIndentifier) {
		await this.removeTab(ID, false);

		await this.window.updateWindowOptions({ frame: true });
	}

	public async removeTab(tabID: TabIndentifier, closeApp: boolean) {
		const index: number = this.getTabIndex(tabID);

		if (index !== -1) {
			await this._tabs[index].remove(closeApp);
			this._tabs.splice(index, 1);
		}
	}

	public async switchTab(ID: TabIndentifier) {
		const tab = this.getTab(ID);

		if (tab && tab !== this._activeTab) {
			await tab.window.show();

			if (this._activeTab) {
				this._activeTab.window.hide();
			}

			this.setActiveTab(tab);
		}
	}

	public async removeAllTabs(closeApp: boolean) {
		// this._tabs.slice().forEach(async tab => {
		// 	await this.removeTab(tab.ID, closeApp);
		// });

		return Promise.all(
			this._tabs.slice().map(tab => {
				this.removeTab(tab.ID, closeApp);
			})
		);
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

	public setActiveTab(tab: Tab) {
		this._activeTab = tab;
		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this.ID, ClientUIIABTopics.TABACTIVATED, tab.ID);
	}

	public getTabIndex(tabID: TabIndentifier): number {
		return this.tabs.findIndex((tab: Tab) => {
			return tabID === tab.ID;
		});
	}

	public get initialWindowOptions() {
		return this._windowOptions;
	}

	public get activeTab() {
		return this._activeTab;
	}

	public get window() {
		return this._window;
	}

	public get tabs() {
		return this._tabs;
	}
}
