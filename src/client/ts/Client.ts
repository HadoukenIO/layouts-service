import { ClientIABTopics, TabIndentifier } from "../../shared/types";
import * as Utils from "../../shared/utils";
console.log("App Window Info: ", fin.desktop.Application.getCurrent().uuid, fin.desktop.Window.getCurrent().name);

export interface ClientEvents {
	[index: string]: Function | null;
}

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

	public static addEventListener(topic: "TABBED" | "UNTABBED", callback: Function) {
		Client.events[topic] = callback;

		const tabbedEvent = (message: {}, uuid: string, name: string) => {
			console.log(message, name, uuid);
			if (Client.events.TABBED) {
				Client.events.TABBED({ uuid, name });
			}
		};

		const untabbedEvent = (message: {}, uuid: string, name: string) => {
			if (Client.events.UNTABBED) {
				Client.events.UNTABBED({ uuid, name });
			}
		};

		fin.desktop.InterApplicationBus.subscribe("*", "TABBED", tabbedEvent);

		fin.desktop.InterApplicationBus.subscribe("*", "UNTABBED", untabbedEvent);

		console.log(Client.events);
	}

	private static uuid: string = fin.desktop.Application.getCurrent().uuid;
	private static windowName: string = fin.desktop.Window.getCurrent().name;
	private static events: ClientEvents = {
		TABBED: null,
		UNTABBED: null
	};

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
