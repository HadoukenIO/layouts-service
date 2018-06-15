import { Tab, TabIndentifier } from "./Tab";

export class TabManager {
	private static INSTANCE: TabManager;

	private tabs: Tab[] = [];
	private activeTab: Tab | null = null;
	private tabContainer: HTMLElement = document.getElementById("tabs")!;

	constructor() {
		if (TabManager.INSTANCE) {
			return TabManager.INSTANCE;
		}

		TabManager.INSTANCE = this;
	}

	public addTab(tabID: TabIndentifier): void {
		if (this._getTabIndex(tabID) === -1) {
			this.tabs.push(new Tab(tabID));
		}
	}

	public removeTab(tabID: TabIndentifier): void {
		const index: number = this._getTabIndex(tabID);
		const tab: Tab | undefined = this.getTab(tabID);

		if (tab && index !== -1) {
			tab.remove();
			this.tabs.splice(index, 1);

			if (this.activeTab === tab) {
				this.unsetActiveTab();
				this.setActiveTab();
			}
		}
	}

	public unsetActiveTab(): void {
		if (!this.activeTab) {
			return;
		}

		this.activeTab.unsetActive();
	}

	public setActiveTab(tabID: TabIndentifier | null = null): void {
		if (tabID) {
			const tab: Tab | undefined = this.getTab(tabID);

			if (tab) {
				this.unsetActiveTab();

				tab.setActive();
				this.activeTab = tab;
			} else {
				tabID = null;
			}
		}

		if (!tabID) {
			if (this.tabs.length > 0) {
				this.setActiveTab({
					name: this.tabs[0].getWindowName,
					uuid: this.tabs[0].getAppUuid
				});
			}
		}
	}

	public getTab(tabID: TabIndentifier): Tab | undefined {
		return this.tabs.find((tab: Tab) => {
			return tab.getWindowName === tabID.name && tab.getAppUuid === tabID.uuid;
		});
	}

	private _getTabIndex(tabID: TabIndentifier): number {
		return this.tabs.findIndex((tab: Tab) => {
			return tab.getWindowName === tabID.name && tab.getAppUuid === tabID.uuid;
		});
	}

	public get getTabs(): Tab[] {
		return this.tabs;
	}

	public static get instance() {
		if (TabManager.INSTANCE) {
			return TabManager.INSTANCE;
		} else {
			return new TabManager();
		}
	}
}
