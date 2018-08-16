import { TabAPIActions, TabApiEvents } from "./APITypes";
import { TabAPIDragMessage, TabAPIInteractionMessage, TabAPIMessage, TabProperties, TabIdentifier } from "./types";
import { Api } from "./Api";
import { TabbingApiWindowActions } from "./TabbingApiWindowActions";

/**
 * @description Interface to outline shape of event listeners for storage
 */
interface EventListener {
	eventType: TabApiEvents;
	callback: Function;
}

/**
 * @class Client tabbing API
 */
export class TabbingApi extends Api {
	/**
	 * @private
	 * @description Class that holds window events
	 */
	private mWindowActions: TabbingApiWindowActions | undefined;

	/**
	 * @public
	 * @function windowActions Property for getting the window action object
	 */
	public get windowActions(): TabbingApiWindowActions | undefined {
		return this.mWindowActions;
	}

	/**
	 * @constructor
	 * @description Constructor for the TabbingApi class
	 */
	constructor() {
		super();
		this.mWindowActions = new TabbingApiWindowActions();
	}

	/**
	 * Sends a new tab order to the service when tabs are reordered in the UI.
	 * @param {Tab[]} tabs Tab Identifiers in index order of first (0) to last (n).  
	 */
	public sendTabOrder(tabs: TabIdentifier[] = []) {
		if (tabs.length === 0) {
			console.log("No tabs passed in");
			return;
		}

		for (const id of tabs) {
			if (!id.uuid || !id.name) {
				console.error("Malformed Tab ID: ", id);
				return;
			}
		}

		const payload = {
			action: TabAPIActions.TABSREORDERED,
			properties: tabs
		};

		super.sendAction(payload);
	}

	/**
	 * @public
	 * @function add Adds an application specified to this tab
	 * @param uuid The uuid of the application to be added
	 * @param name The name of the application to be added
	 */
	public addTab(uuid: string, name: string, tabProperties?: TabProperties): void {
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

		super.sendAction(payload);
	}

	/**
	 * @public
	 * @function eject Removes the application
	 * @param uuid The uuid of the application to eject
	 * @param name The name of the application to eject
	 */
	public ejectTab(uuid: string, name: string): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.EJECT, uuid, name };

		super.sendAction(payload);
	}

	/**
	 * @public
	 * @function activateTab Activates the selected tab and brings to front
	 * @param uuid The uuid of the application to activate
	 * @param name The name of the application to activate
	 */
	public activateTab(uuid: string, name: string): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.ACTIVATE, uuid, name };

		super.sendAction(payload);
	}

	/**
	 * @public
	 * @function closeTab Closes the tab and the application along with it
	 * @param uuid The uuid of the application
	 * @param name The name of the application
	 */
	public closeTab(uuid: string, name: string): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.CLOSE, uuid, name };

		super.sendAction(payload);
	}

	/**
	 * @public
	 * @function updateTabProperties Updates the tab properties, for example name and icon
	 * @param uuid The uuid of the tab to update properties
	 * @param name The name of the tab to update properties
	 * @param properties The new properties
	 */
	public updateTabProperties(uuid: string, name: string, properties: TabProperties): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		if (!properties) {
			console.error("No properties has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.UPDATEPROPERTIES, uuid, name, properties };

		super.sendAction(payload);
	}

	public startDrag(): void {
		const payload: TabAPIMessage = { action: TabAPIActions.STARTDRAG };

		super.sendAction(payload);
	}

	public endDrag(event: DragEvent, uuid: string, name: string): void {
		if (!event) {
			console.error('No drag event has been passed in');
			return;
		}
		if (!uuid) {
			console.error('No uuid has been passed in');
			return;
		}

		if (!name) {
			console.error('No name has been passed in');
			return;
		}

		const payload: TabAPIDragMessage = { action: TabAPIActions.ENDDRAG, uuid, name, event: { screenX: event.screenX, screenY: event.screenY } };

		super.sendAction(payload);
	}
}
