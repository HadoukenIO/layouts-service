import { TabIndentifier } from "../../shared/types";
import { TabOptions } from "./Tab";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";

export class TabWindow {
	private windowManager: WindowManager = new WindowManager();
	private tabManager: TabManager = new TabManager();

	constructor() {
		console.log("Tab Window Info: ", fin.desktop.Application.getCurrent().uuid, fin.desktop.Window.getCurrent().name);
		this._getCustomData().then((customData: TabIndentifier & TabOptions) => {
			const alignTabWindow: boolean = customData.alignTabWindow || false;

			this.tabManager.addTab({
				name: customData.name,
				uuid: customData.uuid,
				alignTabWindow
			});
			this.windowManager.getWindow.show();
		});
	}

	private _getCustomData(): Promise<TabIndentifier & TabOptions> {
		return new Promise<TabIndentifier & TabOptions>((resolve, reject) => {
			fin.desktop.Window.getCurrent().getOptions(options => {
				const customData = JSON.parse(options.customData);
				resolve(customData);
			});
		});
	}
}
