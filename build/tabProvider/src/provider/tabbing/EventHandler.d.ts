import { TabService } from "./TabService";
/**
 * @class Handles events coming from the application
 */
export declare class EventHandler {
    /**
     * Handle to the TabService
     */
    private _service;
    /**
     * Constructor for the Event handler class
     * @param {TabService} service Tab service
     */
    constructor(service: TabService);
    /**
     * Subscribes to topics and handles messages coming into those topics
     */
    private _createListeners;
    /**
     * For each group tab we realign all the apps when there is a change in monitor information
     */
    private _onMonitorInfoChanged;
    /**
     * Initialises tabbing on the application
     * @param message TabWindowOptions
     * @param uuid The uuid of the application to initialise tabbing on
     * @param name The name of the application to initialise tabbing on
     */
    private _onClientInit;
    /**
     * Deregisters the window from tabbing.
     * @param {} message None.
     * @param {string} uuid The uuid of the application to deregister.
     * @param {string} name The name of the application to deregister.
     */
    private _onClientDeregister;
}
