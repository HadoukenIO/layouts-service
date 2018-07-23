import { ClientIABTopics, ServiceIABTopics, TabIndentifier } from "../../shared/types";

export class Client {
	private _ID: TabIndentifier;

	constructor() {
		this._ID = { uuid: fin.desktop.Application.getCurrent().uuid, name: fin.desktop.Window.getCurrent().name };
	}

	public init(url?: string | undefined, height?: number | undefined) {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", ServiceIABTopics.CLIENTINIT, { url, height });
	}
}

// tslint:disable-next-line:no-any
(window as any).TabClient = new Client();
