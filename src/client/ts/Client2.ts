import { TabIndentifier } from "../../shared/types";

export class Client2 {
	private _UI: string = "";

	constructor() {
		//
	}

	public init(UI: string, additionalWindows: TabIndentifier[] = []) {
		this._UI = UI;
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "Tabbing_Main", "TABINIT", { UI, additionalWindows });
	}
}
// tslint:disable-next-line:no-any
(window as any).TabClient = new Client2();
