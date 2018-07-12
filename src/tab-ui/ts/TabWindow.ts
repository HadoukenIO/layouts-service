import { TabIndentifier, TabOptions } from "../../shared/types";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";

/**
 * Entry point to the tab window itself.  Only gathers any custom data for the window and then signals to create tabs.
 */
export class TabWindow {
	constructor() {
		console.log("Tab Window Info: ", fin.desktop.Application.getCurrent().uuid, fin.desktop.Window.getCurrent().name);
		this._getCustomData().then(async (customData: TabOptions & { tabs: TabIndentifier[] }) => {
			const alignTabWindow: boolean = customData.alignTabWindow || false;

			await TabManager.instance.addTab({
				name: customData.tabs[0].name,
				uuid: customData.tabs[0].uuid,
				alignTabWindow
			});

			WindowManager.instance.getWindow.show();
		});
	}

	private _getCustomData(): Promise<{ tabs: TabIndentifier[] } & TabOptions> {
		return new Promise<{ tabs: TabIndentifier[] } & TabOptions>((resolve, reject) => {
			fin.desktop.Window.getCurrent().getOptions(options => {
				const customData = JSON.parse(options.customData);
				resolve(customData);
			});
		});
	}
}
