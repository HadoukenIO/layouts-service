import { TabIndentifier } from "../../shared/types";
import { TabGroup } from "./TabGroup";

export class TabManager {
	public static INSTANCE: TabManager;

	constructor() {
		// If we already have an instance return that and exit.
		if (TabManager.INSTANCE) {
			return TabManager.INSTANCE;
		}

		TabManager.INSTANCE = this;
	}

	public async createTabGroup(tabID: TabIndentifier) {
		const tabGroup: TabGroup = new TabGroup();
		await tabGroup.init(tabID);
	}

	// tslint:disable-next-line:member-ordering
	public static getInstance(): TabManager {
		return TabManager.INSTANCE;
	}
}
