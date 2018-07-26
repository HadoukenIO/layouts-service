import { TabAPIMessage } from "../../shared/types";

/**
 * @function sendAction sends an action to the
 * @param payload
 */
export function sendAction(payload: TabAPIMessage) {
	fin.desktop.InterApplicationBus.send("Tabbing_Main", "tab-api", payload);
}
