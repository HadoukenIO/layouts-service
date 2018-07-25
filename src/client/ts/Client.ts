import { ClientIABTopics, ServiceIABTopics, TabIndentifier } from "../../shared/types";

class Client {
	private _ID: TabIndentifier;

	constructor() {
		this._ID = {
			uuid: fin.desktop.Application.getCurrent().uuid,
			name: fin.desktop.Window.getCurrent().name
		};
	}

	init(url?: string | undefined, height?: number | undefined) {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", ServiceIABTopics.CLIENTINIT, { url, height });
	}
}

(window as Window & { TabClient: Client }).TabClient = new Client();
