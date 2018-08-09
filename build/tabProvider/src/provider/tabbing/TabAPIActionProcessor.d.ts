import { TabService } from "./TabService";
/**
 * Handles all calls from tab api to service
 */
export declare class TabAPIActionProcessor {
    /**
     * The tab service itself
     */
    private mTabService;
    /**
     * @constructor Constructor for the TabAPIActionProcessor
     */
    constructor(service: TabService);
    /**
     * Initialises the TabAPIActionProcessor
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
     * Starts the drag window process & shows the drag window overlay.
     */
    private _startDrag;
    /**
     * Ends the drag window process & hides the drag window overlay.
     * @param {{}}message None.
     * @param {TabGroup} group The TabGroup attached to this Tab.
     */
    private _endDrag;
    /**
     * This adds an application to a tabgroup
     * @param {TabAPIInteractionMessage} applicationToAttach The application to be attached
     * @param {TabGroup} tabGroup The tab group to attach the application to
     */
    private _add;
    /**
     * Ejects a tab from tab group
     * @param {TabAPIInteractionMessage} applicationToEject The application to eject from the tab group
     * @param {TabGroup} tabGroup The tab group to eject from
     */
    private _eject;
    /**
     * Closes the tab and the application itself
     * @param {TabAPIInteractionMessage} applicationToClose The application to close
     * @param {TabGroup} tabGroup The group the application is within
     */
    private _close;
    /**
     * Activates the tab being selected and brings it to the front
     * @param {TabAPIInteractionMessage} applicationToActivate The application to be activated
     * @param {TabGroup} tabGroup The tab group the application is in
     */
    private _activate;
    /**
     * Updates the properties of the tab
     * @param {TabAPIInteractionMessage} tabToUpdate Holds information about the tab to update and its new properties
     * @param {TabGroup} tabGroup The group the tab is in
     */
    private _updateTabProperties;
}
