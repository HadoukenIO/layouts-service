import { IABTopics } from "../../shared/types";

export class EventHandler {
	constructor() {
		this._createListeners();
	}

	private _createListeners() {
		fin.desktop.InterApplicationBus.subscribe("*", IABTopics.CLIENTINIT, this._onClientInit.bind(this));
	}

	private _onClientInit(message, uuid, name): void {
		//
	}
}
