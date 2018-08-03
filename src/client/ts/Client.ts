import { ClientIABTopics, ServiceIABTopics, TabIndentifier } from "../../shared/types";

class Client {
	private _ID: TabIndentifier;

	constructor() {
		this._ID = {
			uuid: fin.desktop.Application.getCurrent().uuid,
			name: fin.desktop.Window.getCurrent().name
		};

		// Give the frame back if our service dies
		fin.desktop.Window.wrap("Tabbing_Main", "Tabbing_Main").addEventListener("closed", () => {
			fin.desktop.Window.getCurrent().updateOptions({ frame: true });
		});
	}

	init(url?: string | undefined, height?: number | undefined) {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", ServiceIABTopics.CLIENTINIT, { url, height });
	}
}

(window as Window & { TabClient: Client }).TabClient = new Client();

// @ts-ignore
// window.TabClient.init();
