import { TabIndentifier, TabPackage, TabWindowOptions } from "../../shared/types";

import { DragWindowManager } from "./DragWindowManager";
import { EventHandler } from "./EventHandler";
import { Tab } from "./Tab";
import { TabAPIActionProcessor } from "./TabAPIActionProcessor";
import { TabGroup } from "./TabGroup";
import { ZIndexer } from "./ZIndexer";

export class TabService {
	public static INSTANCE: TabService;
	private _tabGroups: TabGroup[];
	private _eventHandler: EventHandler;
	private mTabApiEventHandler: TabAPIActionProcessor;
	private _dragWindowManager: DragWindowManager;
	private _zIndexer: ZIndexer = new ZIndexer();

	constructor() {
		this._tabGroups = [];
		this._dragWindowManager = new DragWindowManager();
		this._dragWindowManager.init();

		this._eventHandler = new EventHandler(this);

		this.mTabApiEventHandler = new TabAPIActionProcessor(this);
		this.mTabApiEventHandler.init();

		TabService.INSTANCE = this;
	}

	public async addTabGroup(windowOptions: TabWindowOptions) {
		const group = new TabGroup(windowOptions);
		await group.init();

		this._tabGroups.push(group);

		return group;
	}

	public async removeTabGroup(ID: string, closeApps: boolean) {
		const groupIndex = this._getGroupIndex(ID);

		if (groupIndex !== -1) {
			const group = this._tabGroups[groupIndex];

			await group.removeAllTabs(closeApps);
			await group.window.close(true);

			this._tabGroups.splice(groupIndex, 1);
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
			this._tabGroups.map(async group => {
				const activeTabBoundsP = group.activeTab.window.getWindowBounds();
				const groupBoundsP = group.window.getWindowBounds();

				const [activeTabBounds, groupBounds] = await Promise.all([activeTabBoundsP, groupBoundsP]);

				return {
					group,
					top: groupBounds.top!,
					left: groupBounds.left!,
					width: groupBounds.width!,
					height: groupBounds.height! + activeTabBounds.height!
				};
			})
		);

		const result = groupTabBounds.filter(group => {
			return x > group.left && x < group.width + group.left && y > group.top && y < group.top + group.height;
		});

		if (result) {
			const topOrdered = this._zIndexer.getTop(
				result.map(group => {
					return { uuid: group.group.activeTab.ID.uuid, name: group.group.activeTab.ID.name };
				})
			);

			if (topOrdered) {
				const f = result.find(g => {
					return g.group.activeTab.ID.uuid === topOrdered[0].uuid && g.group.activeTab.ID.name === topOrdered[0].name;
				});

				if (f) {
					return f.group;
				}
			}
		}

		return null;
	}

	private _getGroupIndex(ID: string): number {
		return this._tabGroups.findIndex((tab: TabGroup) => {
			return tab.ID === ID;
		});
	}

	public get dragWindowManager() {
		return this._dragWindowManager;
	}

	public get tabGroups() {
		return this._tabGroups;
	}
}
