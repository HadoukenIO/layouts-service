import { TabAPIActions, TabApiEvents, TabAPIInteractionMessage, TabProperties } from "../../shared/types";
import { ClientUIWindowActions } from "./ClientUIWindowActions";
import { sendAction } from "./ClientUtilities";

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
export class TabbingApi {
	public windowActions = new ClientUIWindowActions();

	/**
	 * @private
	 * @description Holds event listeners
	 */
	private mEventListeners: EventListener[];

	/**
	 * @constructor
	 * @description Constructor for the TabbingApi class
	 */
	constructor() {
		this.mEventListeners = [];
	}

	/**
	 * @public
	 * @function add Adds an application specified to this tab
	 * @param uuid The uuid of the application to be added
	 * @param name The name of the application to be added
	 */
	public addTab(uuid: string, name: string, tabProperties: TabProperties): void {
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

		sendAction(payload);
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

		sendAction(payload);
	}

	/**
	 * @public
	 * @function addEventListener Adds an event listener
	 * @param event The Api event to listen to
	 * @param callback callback to handle the data received
	 */
	public addEventListener<T>(event: TabApiEvents, callback: (message: T) => void): void {
		fin.desktop.InterApplicationBus.subscribe(
			"*",
			event,
			callback,
			() => {
				this.mEventListeners.push({ eventType: event, callback });
			},
			(reason: string) => {
				console.error(reason);
			}
		);
	}

	/**
	 * @public
	 * @function activateTab Activates the selected tab and brings to front
	 * @param uuid The uuid of the application to activate
	 * @param name The name of the application to activate
	 */
	public activateTab(uuid: string, name: string): void {
		if (!uuid) {
			console.error("No uui has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.ACTIVATE, uuid, name };

		sendAction(payload);
	}

	/**
	 * @public
	 * @function removeEventListener Removes an event listener
	 * @param event The api event that is being listened to
	 * @param callback The callback registered to the event
	 */
	public removeEventListener<T>(event: TabApiEvents, callback: (message: T) => void): void {
		const removeApiEvent: TabApiEvents = event;
		fin.desktop.InterApplicationBus.unsubscribe(
			"*",
			event,
			callback,
			() => {
				const eventToRemove: EventListener = { eventType: removeApiEvent, callback };
				const index: number = this.mEventListeners.findIndex((currentEvent: EventListener) => {
					return currentEvent.eventType === eventToRemove.eventType && currentEvent.callback === eventToRemove.callback;
				});

				delete this.mEventListeners[index];
			},
			(reason: string) => {
				console.error(reason);
			}
		);
	}

	/**
	 * @public
	 * @function close Closes the tab and the application along with it
	 * @param uuid The uuid of the application
	 * @param name The name of the application
	 */
	public close(uuid: string, name: string): void {
		if (!uuid) {
			console.error("No uuid has been passed in");
			return;
		}

		if (!name) {
			console.error("No name has been passed in");
			return;
		}

		const payload: TabAPIInteractionMessage = { action: TabAPIActions.CLOSE, uuid, name };

		sendAction(payload);
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

		sendAction(payload);
	}
}

(window as Window & { Tab: TabbingApi }).Tab = new TabbingApi();
