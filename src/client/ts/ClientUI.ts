import { ClientUIIABTopics, ServiceIABTopics, TabAPIActions, TabAPIInteractionMessage, TabIndentifier, TabProperties } from "../../shared/types";

/**
 * @class Client tabbing API
 */
export class ClientUI {
	private _ID: TabIndentifier;

	constructor() {
		this._ID = {
			uuid: fin.desktop.Application.getCurrent().uuid,
			name: fin.desktop.Window.getCurrent().name
		};

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

	/**
	 * @public
	 * @function add Adds an application specified to this tab
	 * @param uuid The uuid of the application to be added
	 * @param name The name of the application to be added
	 */
	public add(uuid: string, name: string, tabProperties: TabProperties): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = {
			action: TabAPIActions.ADD,
			uuid,
			name,
			properties: tabProperties
		};

		this.sendAction(payload);
	}

	/**
	 * @public
	 * @function eject Removes the application
	 * @param uuid The uuid of the application to eject
	 * @param name The name of the application to eject
	 */
	public eject(uuid: string, name: string): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.EJECT, uuid, name };

		this.sendAction(payload);
    }

    /**
     * @public
     * @function close Closes the tab and the application along with it
     * @param uuid The uuid of the application
     * @param name The name of the application
     */
    public close(uuid: string, name: string): void {
        if (!uuid) {
            console.error('No uuid has been passed in');
            return;
        }

        if (!name) {
            console.error('No name has been passed in');
            return;
        }

        const payload: TabAPIInteractionMessage = { action: TabAPIActions.CLOSE, uuid, name }

        this.sendAction(payload);
    }

	/**
	 * @function sendAction sends an action to the
	 * @param payload
	 */
	private sendAction(payload: TabAPIInteractionMessage) {
		fin.desktop.InterApplicationBus.send("Tabbing_Main", "tab-api", payload);
	}
}

(window as Window & { TabClientUI: ClientUI }).TabClientUI = new ClientUI();
