import { TabProperties } from "../shared/types";
import { Api } from "./Api";
import { TabbingApiWindowActions } from "./TabbingApiWindowActions";
/**
 * @class Client tabbing API
 */
export declare class TabbingApi extends Api {
    /**
     * @private
     * @description Class that holds window events
     */
    private mWindowActions;
    /**
     * @public
     * @function windowActions Property for getting the window action object
     */
    readonly windowActions: TabbingApiWindowActions | undefined;
    /**
     * @constructor
     * @description Constructor for the TabbingApi class
     */
    constructor();
    /**
     * @public
     * @function add Adds an application specified to this tab
     * @param uuid The uuid of the application to be added
     * @param name The name of the application to be added
     */
    addTab(uuid: string, name: string, tabProperties?: TabProperties): void;
    /**
     * @public
     * @function eject Removes the application
     * @param uuid The uuid of the application to eject
     * @param name The name of the application to eject
     */
    ejectTab(uuid: string, name: string): void;
    /**
     * @public
     * @function activateTab Activates the selected tab and brings to front
     * @param uuid The uuid of the application to activate
     * @param name The name of the application to activate
     */
    activateTab(uuid: string, name: string): void;
    /**
     * @public
     * @function closeTab Closes the tab and the application along with it
     * @param uuid The uuid of the application
     * @param name The name of the application
     */
    closeTab(uuid: string, name: string): void;
    /**
     * @public
     * @function updateTabProperties Updates the tab properties, for example name and icon
     * @param uuid The uuid of the tab to update properties
     * @param name The name of the tab to update properties
     * @param properties The new properties
     */
    updateTabProperties(uuid: string, name: string, properties: TabProperties): void;
    startDrag(): void;
    endDrag(event: DragEvent, uuid: string, name: string): void;
}
