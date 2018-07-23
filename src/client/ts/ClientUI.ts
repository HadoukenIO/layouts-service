import { ClientUIIABTopics, ServiceIABTopics, TabIndentifier } from "../../shared/types";

export class ClientUI {
	private _ID: TabIndentifier;

	constructor() {
		this._ID = { uuid: fin.desktop.Application.getCurrent().uuid, name: fin.desktop.Window.getCurrent().name };

		fin.desktop.InterApplicationBus.subscribe("*", ClientUIIABTopics.PROPERTIESUPDATED, message => {
			console.log(ClientUIIABTopics.PROPERTIESUPDATED, message);
		});

		fin.desktop.InterApplicationBus.subscribe("*", ClientUIIABTopics.TABADDED, message => {
			console.log(ClientUIIABTopics.TABADDED, message);
		});

		fin.desktop.InterApplicationBus.subscribe("*", ClientUIIABTopics.TABACTIVATED, message => {
			console.log(ClientUIIABTopics.TABACTIVATED, message);
		});

		fin.desktop.InterApplicationBus.subscribe("*", ClientUIIABTopics.TABREMOVED, message => {
			console.log(ClientUIIABTopics.TABREMOVED, message);
		});
	}
}

// tslint:disable-next-line:no-any
(window as any).TabClientUI = new ClientUI();
