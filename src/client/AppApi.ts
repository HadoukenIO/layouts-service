import { Api } from "./Api";
import { AppApiEvents } from "./APITypes";
import { TabIdentifier, ServiceIABTopics, TabServiceID } from "./types";
import { TabService } from "../provider/tabbing/TabService";

export class AppApi extends Api {
	private _ID: TabIdentifier;

	constructor() {
		super();

		this._ID = {
			uuid: fin.desktop.Application.getCurrent().uuid,
			name: fin.desktop.Window.getCurrent().name
		};
	}

	public init(url?: string | undefined, height?: number | undefined) {
		fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, ServiceIABTopics.CLIENTINIT, { url, height });

		// Give the frame back if our service dies
		fin.desktop.Window.wrap(TabServiceID.UUID, TabServiceID.NAME).addEventListener("closed", () => {
			fin.desktop.Window.getCurrent().updateOptions({ frame: true });
		});
	}

	public deregister() {
		fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, AppApiEvents.DEREGISTER, {});
	}
}

(window as Window & { TabClient: AppApi }).TabClient = new AppApi();
