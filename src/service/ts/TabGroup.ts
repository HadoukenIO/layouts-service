import { IABTopics, TabIndentifier } from "../../shared/types";
import { TabManager } from "./TabManager";

export class TabGroup {
	private _tabManager: TabManager = TabManager.getInstance();
	private _window!: fin.OpenFinWindow;

	constructor() {
		//
	}

	public async init(tabID: TabIndentifier) {
		this._window = await this._createTabWindow();

		await fin.desktop.InterApplicationBus.send(tabID.uuid, tabID.name, IABTopics.TABADDED, tabID);
	}

	private async _createTabWindow() {
		const win = await new fin.Window({
			name: `${Math.random() * 10000}`,
			url: "http://localhost:9001/tab-ui/",
			autoShow: false,
			frame: false,
			maximizable: false,
			resizable: false,
			defaultHeight: 62,
			defaultWidth: 100,
			defaultLeft: 100,
			defaultTop: 100,
			saveWindowState: false
		});

		return win;
	}
}
