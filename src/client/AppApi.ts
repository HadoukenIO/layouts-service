import { Api } from "./Api";
import { AppApiEvents } from "./APITypes";
import { TabIdentifier, ServiceIABTopics, TabServiceID, TabWindowOptions } from "./types";

export class AppApi extends Api {
	private _ID: TabIdentifier;

	constructor() {
		super();
		this._ID = {
			uuid: fin.desktop.Application.getCurrent().uuid,
			name: fin.desktop.Window.getCurrent().name
		};
	}

    /**
     * Sets the url for the tab
     * @param url The url for the custom tab
     */
    public setTabClient(url: string, height?: number): void {
        if (!url) {
            console.error("No url has been set");
            return;
        }


        fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, ServiceIABTopics.SETTABCLIENT, { url, height });

        // Give the frame back if our service dies
        fin.desktop.Window.wrap(TabServiceID.UUID, TabServiceID.NAME).addEventListener("closed", () => {
            fin.desktop.Window.getCurrent().updateOptions({ frame: true });
        });
    }

     /**
     * Sets the url for the tab
     * @param url The url for the custom tab
     */
    public showTabClient(url: string, height?: number): void {
        if (!url) {
            console.error("No url has been set");
            return;
        }


        fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, ServiceIABTopics.CLIENTINIT, null);

        // Give the frame back if our service dies
        fin.desktop.Window.wrap(TabServiceID.UUID, TabServiceID.NAME).addEventListener("closed", () => {
            fin.desktop.Window.getCurrent().updateOptions({ frame: true });
        });
    }

	public deregister() {
		fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, AppApiEvents.DEREGISTER, {});
	}
}

(window as Window & { TabClient: AppApi }).TabClient = new AppApi();
