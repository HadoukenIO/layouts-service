import { ClientIABTopics, TabIndentifier } from "../../shared/types";
import * as Utils from "../../shared/utils";
console.log("App Window Info: ", fin.desktop.Application.getCurrent().uuid, fin.desktop.Window.getCurrent().name);

export class Client {
	public static ejectTab(): void {
		Client.sendToTabWindow(ClientIABTopics.EJECTREQUEST);
	}

	public static changeIcon(icon: string) {
		Client.sendToTabWindow(ClientIABTopics.CHANGEICON, { icon });
	}

	public static async bringInWindow(uuid: string, name: string) {
		const tabWindow = await Utils.getTabWindow({ uuid, name });
		console.log("External Tab Window", tabWindow);
		fin.desktop.InterApplicationBus.send(tabWindow.uuid, tabWindow.name, ClientIABTopics.JOINREQUEST, { ...Client.getTabID(), extUuid: uuid, extName: name });
	}

	public static async joinWindow(uuid: string, name: string) {
		const tabWindow = await Utils.getTabWindow();
		fin.desktop.InterApplicationBus.send(tabWindow.uuid, tabWindow.name, ClientIABTopics.JOINREQUEST, { uuid, name, extUuid: Client.uuid, extName: Client.windowName });
	}

	private static uuid: string = fin.desktop.Application.getCurrent().uuid;
	private static windowName: string = fin.desktop.Window.getCurrent().name;

	private static getTabID() {
		return { uuid: Client.uuid, name: Client.windowName };
	}

	// tslint:disable-next-line:no-any
	private static async sendToTabWindow(topic: string, message: any = {}) {
		const tabWindow = await Utils.getTabWindow();
		fin.desktop.InterApplicationBus.send(tabWindow.uuid, tabWindow.name, topic, { ...Client.getTabID(), ...message });
	}
}

// tslint:disable-next-line:no-any
(window as any).TabClient = Client;
