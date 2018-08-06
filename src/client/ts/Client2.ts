import { TabIdentifier } from "../../shared/types";

export class Client2 {
	private _UI = "";

	constructor() {
		//
	}

	init(UI: string, additionalWindows: TabIdentifier[] = []) {
		this._UI = UI;
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", "TABINIT", { UI, additionalWindows });
	}
}
// tslint:disable-next-line:no-any
(window as any).TabClient = new Client2();
