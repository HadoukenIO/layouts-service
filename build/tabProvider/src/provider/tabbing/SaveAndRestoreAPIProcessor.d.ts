import { TabService } from "./TabService";
/**
 * Handles all calls from tab api to service
 */
export declare class SaveAndRestoreAPIProcessor {
    /**
     * The tab service itself
     */
    private mTabService;
    /**
     * @constructor Constructor for the SaveAndRestoreAPIProcessor
     */
    constructor(service: TabService);
    /**
     * Initialises the SaveAndRestoreAPIProcessor
     */
    init(): void;
    /**
     * Processes incoming API messages from the Tab API.
     * @param message The payload the tab api sent
     * @param uuid uuid of the sender
     * @param name name of the sender
     */
    private process;
    /**
     * Gathers information from tab sets and their tabs, and returns as a JSON object back to the requesting application/window.
     * @param uuid Uuid of the requesting Application
     * @param name Name of the requesting window
     */
    private _onGetBlob;
}
