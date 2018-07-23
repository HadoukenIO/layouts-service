import { TabIndentifier, TabPackage, TabWindowOptions } from "../../shared/types";
import { EventHandler } from "./EventHandler";
import { Tab } from "./Tab";
import { TabGroup } from "./TabGroup";

export class TabService {
	private _tabGroups: TabGroup[];
	private _eventHandler: EventHandler;

	constructor() {
		this._tabGroups = [];
		this._eventHandler = new EventHandler(this);
	}

	public async addTabGroup(windowOptions: TabWindowOptions) {
		const group = new TabGroup(windowOptions);
		await group.init();

		this._tabGroups.push(group);

		return group;
	}

	public removeTabGroup(ID: string, closeApps: boolean) {
		const group = this.getTabGroup(ID);

		if (group) {
			group.removeAllTabs(closeApps);
		}
	}

	public getTabGroup(ID: string) {
		return this._tabGroups.find((group: TabGroup) => {
			return group.ID === ID;
		});
	}

	public getTabGroupByApp(ID: TabIndentifier): TabGroup | undefined {
		return this._tabGroups.find((group: TabGroup) => {
			return group.tabs.some((tab: Tab) => {
				const tabID = tab.ID;
				return tabID.name === ID.name && tabID.uuid === ID.uuid;
			});
		});
	}

	public getTab(ID: TabIndentifier): Tab | undefined {
		const group = this.getTabGroupByApp(ID);

		if (group) {
			return group.getTab(ID);
		}

		return;
	}

	public async isPointOverTabGroup(x: number, y: number): Promise<TabGroup | null> {
		const groupTabBounds = await Promise.all(
			this._tabGroups.map(async group => {
				const activeTabBounds = await group.activeTab.window.getWindowBounds();
				const groupBounds = await group.window.getWindowBounds();

				return { group, top: groupBounds.top!, left: groupBounds.left!, width: groupBounds.width!, height: groupBounds.height! + activeTabBounds.height! };
			})
		);

		const result = groupTabBounds.find(group => {
			return x > group.left && x < group.width + group.left && y > group.top && y < group.top + group.height;
		});

		if (result) {
			return result.group;
		} else {
			return null;
		}
	}

	public get tabGroups() {
		return this._tabGroups;
	}
}
