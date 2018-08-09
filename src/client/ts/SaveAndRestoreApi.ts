import { SaveAndRestoreActions, SaveAndRestoreEvents } from "../../shared/APITypes";
import { TabBlob, TabServiceID } from "../../shared/types";

class SaveAndRestoreAPI {
	static getTabBlob(): Promise<TabBlob[]> {
		return new Promise((res, rej) => {
			const listener = (message: TabBlob[]) => {
				fin.desktop.InterApplicationBus.unsubscribe(TabServiceID.UUID, TabServiceID.NAME, SaveAndRestoreEvents.GETBLOBRETURN, listener);
				res(message);
			};

			fin.desktop.InterApplicationBus.subscribe(TabServiceID.UUID, TabServiceID.NAME, SaveAndRestoreEvents.GETBLOBRETURN, listener);

			fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, { action: SaveAndRestoreActions.GETBLOB });
		});
	}
}

// tslint:disable-next-line:no-any
(window as any).SARAPI = SaveAndRestoreAPI;
