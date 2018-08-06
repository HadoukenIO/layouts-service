import { AppApiEvents, TabApiEvents } from "../../shared/APITypes";
import { TabAPIMessage } from "../../shared/types";

/**
 * @description Interface to outline shape of event listeners for storage
 */
export interface EventListener {
	eventType: string;
	callback: Function;
}

export abstract class Api {
	/**
	 * @private
	 * @description Holds event listeners
	 */
	protected mEventListeners: EventListener[];

	/**
	 * @constructor
	 * @description Constructor for the Api class
	 */
	constructor() {
		this.mEventListeners = [];
	}

	/**
	 * @protected
	 * @function addEventListener Adds an event listener
	 * @param event The Api event to listen to
	 * @param callback callback to handle the data received
	 */
	public addEventListener<T extends TabApiEvents | AppApiEvents, U>(event: T, callback: (message: U) => void): void {
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
	 * @protected
	 * @function removeEventListener Removes an event listener
	 * @param event The api event that is being listened to
	 * @param callback The callback registered to the event
	 */
	public removeEventListener<T extends TabApiEvents | AppApiEvents, U>(event: T, callback: (message: U) => void): void {
		const removeApiEvent: TabApiEvents | AppApiEvents = event;
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
	 * @function sendAction sends an action to the
	 * @param payload
	 */
	protected sendAction(payload: TabAPIMessage) {
		if (!payload) {
			console.error("No payload was passed in");
			return;
		}

		fin.desktop.InterApplicationBus.send("Tabbing_Main", "tab-api", payload);
	}
}
