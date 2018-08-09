import { Api } from "./Api";
import { AppApiEvents } from '../shared/APITypes';
import { TabIdentifier, ServiceIABTopics } from '../shared/types';

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

	public init(url?: string | undefined, height?: number | undefined) {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", ServiceIABTopics.CLIENTINIT, { url, height });
	}

	public deregister() {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", AppApiEvents.DEREGISTER, {});
	}
}

(window as Window & { TabClient: AppApi }).TabClient = new AppApi();
