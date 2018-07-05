import { ClientIABTopics, TabIndentifier } from "./types";

export async function getTabWindow(externalWindow: TabIndentifier | null = null): Promise<TabIndentifier> {
	return new Promise<TabIndentifier>(res => {
		// tslint:disable-next-line:no-any
		const listener = (message: any, uuid: string, name: string) => {
			fin.desktop.InterApplicationBus.unsubscribe("*", ClientIABTopics.DISCOVERRETURN, listener);

			res({ uuid, name });
		};

		const publishMessage =
			externalWindow && externalWindow.uuid && externalWindow.name ? { uuid: externalWindow.uuid, name: externalWindow.name } : { uuid: fin.desktop.Application.getCurrent().uuid, name: fin.desktop.Window.getCurrent().name };

		console.log("Publish Message: ", publishMessage);
		fin.desktop.InterApplicationBus.publish(ClientIABTopics.DISCOVER, publishMessage);
		fin.desktop.InterApplicationBus.subscribe("*", ClientIABTopics.DISCOVERRETURN, listener);
	});
}
