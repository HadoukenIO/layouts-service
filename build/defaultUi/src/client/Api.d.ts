import { AppApiEvents, TabApiEvents } from "../shared/APITypes";
import { TabAPIMessage } from "../shared/types";
/**
 * @description Interface to outline shape of event listeners for storage
 */
export interface EventListener {
    eventType: string;
    callback: Function;
}
export declare abstract class Api {
    /**
     * @private
     * @description Holds event listeners
     */
    protected mEventListeners: EventListener[];
    /**
     * @constructor
     * @description Constructor for the Api class
     */
    constructor();
    /**
     * @protected
     * @function addEventListener Adds an event listener
     * @param event The Api event to listen to
     * @param callback callback to handle the data received
     */
    addEventListener<T extends TabApiEvents | AppApiEvents, U>(event: T, callback: (message: U) => void): void;
    /**
     * @protected
     * @function removeEventListener Removes an event listener
     * @param event The api event that is being listened to
     * @param callback The callback registered to the event
     */
    removeEventListener<T extends TabApiEvents | AppApiEvents, U>(event: T, callback: (message: U) => void): void;
    /**
     * @function sendAction sends an action to the
     * @param payload
     */
    protected sendAction(payload: TabAPIMessage): void;
}
