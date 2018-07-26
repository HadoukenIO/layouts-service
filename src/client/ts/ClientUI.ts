import { TabApiEvents, ServiceIABTopics, TabAPIActions, TabAPIInteractionMessage, TabIndentifier, TabProperties } from "../../shared/types";

/**
 * @description Interface to outline shape of event listeners for storage
 */
interface IEventListener {
    eventType: TabApiEvents,
    callback: Function
};

/**
 * @class Client tabbing API
 */
export class TabbingApi {

    /**
     * @private
     * @description Holds event listeners
     */
    private mEventListeners: IEventListener[];

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

		this.sendAction(payload);
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

		this.sendAction(payload);
    }

    /**
     * @public
     * @function addEventListener Adds an event listener
     * @param event The Api event to listen to
     * @param callback callback to handle the data received
     */
    public addEventListener<T>(event: TabApiEvents, callback: (message: T) => void): void {
        fin.desktop.InterApplicationBus.subscribe("*", event, callback,
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
        
        if(!name) {
            console.error("No name has been passed in");
            return;
        }

        const payload: TabAPIInteractionMessage = { action: TabAPIActions.ACTIVATE, uuid, name };

        this.sendAction(payload);
    }

    /**
     * @public
     * @function removeEventListener Removes an event listener
     * @param event The api event that is being listened to
     * @param callback The callback registered to the event
     */
    public removeEventListener<T>(event: TabApiEvents, callback: (message: T) => void): void {
        let removeApiEvent: TabApiEvents = event;
        fin.desktop.InterApplicationBus.unsubscribe("*", event, callback,
            () => {

                let eventToRemove: IEventListener = { eventType: removeApiEvent, callback: callback }
                let index: number = this.mEventListeners.findIndex((event: IEventListener) => {
                    return event.eventType === eventToRemove.eventType && event.callback === eventToRemove.callback;
                });

                delete this.mEventListeners[index];
            },
            (reason: string) => {
                console.error(reason);
            }
        );
    }
    
    /** 
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
            console.error("No name has been passed in");
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

(window as Window & { Tab: TabbingApi }).Tab = new TabbingApi();
