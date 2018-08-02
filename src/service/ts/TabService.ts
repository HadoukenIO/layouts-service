import { TabIndentifier, TabPackage, TabWindowOptions } from "../../shared/types";

import { EventHandler } from "./EventHandler";
import { Tab } from "./Tab";
import { TabAPIActionProcessor } from "./TabAPIActionProcessor";
import { TabGroup } from "./TabGroup";

interface GroupInfo {
    group: TabGroup,
    top: number,
    left: number,
    width: number,
    height: number
}

export class TabService {
	public static INSTANCE: TabService;
	private _tabGroups: TabGroup[];
	private _eventHandler: EventHandler;
	private mTabApiEventHandler: TabAPIActionProcessor;

	constructor() {
		this._tabGroups = [];
		this._eventHandler = new EventHandler(this);

		TabService.INSTANCE = this;

		this.mTabApiEventHandler = new TabAPIActionProcessor(this);
		this.mTabApiEventHandler.init();

	}

    public async addTabGroup(windowOptions: TabWindowOptions): Promise<TabGroup> {
		const group = new TabGroup(windowOptions);
		await group.init();

		this._tabGroups.push(group);

		return group;
	}

	public async removeTabGroup(ID: string, closeApps: boolean): Promise<void> {
		const group = this.getTabGroup(ID);

		if (group) {
			await group.removeAllTabs(closeApps);
			await group.window.close(true);
		}
	}

	public getTabGroup(ID: string): TabGroup | undefined {
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
            this._tabGroups.map(async (group: TabGroup) => {
				const activeTabBounds = await group.activeTab.window.getWindowBounds();
				const groupBounds = await group.window.getWindowBounds();

				return {
					group,
					top: groupBounds.top!,
					left: groupBounds.left!,
					width: groupBounds.width!,
					height: groupBounds.height! + activeTabBounds.height!
				};
			})
		);

        const result: GroupInfo | undefined = groupTabBounds.find((group: GroupInfo) => {
			return x > group.left && x < group.width + group.left && y > group.top && y < group.top + group.height;
		});

		if (result) {
			return result.group;
		} else {
			return null;
		}
	}

    public get tabGroups(): TabGroup[] {
		return this._tabGroups;
	}
}
