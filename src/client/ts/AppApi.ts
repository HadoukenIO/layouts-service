import { AppApiEvents } from "../../shared/APITypes";
import { ServiceIABTopics, TabIdentifier } from "../../shared/types";
import { Api } from "./Api";

export class AppApi extends Api {
	private _ID: TabIdentifier;

	constructor() {
		super();

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

	deregister() {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", AppApiEvents.DEREGISTER, {});
	}
}

(window as Window & { TabClient: AppApi }).TabClient = new AppApi();
