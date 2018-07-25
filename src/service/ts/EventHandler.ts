import { ServiceIABTopics, TabIndentifier, TabPackage, TabProperties, TabWindowOptions } from "../../shared/types";
import { TabService } from "./TabService";
import { ejectTab, initializeTab } from "./TabUtilities";

/**
 * @class Handles events coming from the application
 */
export class EventHandler {
    /**
     * @private
     * @description Handle to the TabService
     */
	private _service: TabService;

    /**
     * @constructor
     * @description Constructor for the Event handler class
     * @param service Tab service
     */
	constructor(service: TabService) {
		this._service = service;

		this._createListeners();
	}

    /**
     * @private
     * @function _createListeners Subscribes to topics and handles messages coming into those topics
     */
	private async _createListeners(): Promise<void> {
		fin.desktop.InterApplicationBus.subscribe("*", ServiceIABTopics.CLIENTINIT, this._onClientInit.bind(this));
		fin.desktop.InterApplicationBus.subscribe("*", ServiceIABTopics.TABEJECTED, this._onTabEjected.bind(this));
		fin.desktop.InterApplicationBus.subscribe("*", ServiceIABTopics.UPDATETABPROPERTIES, this._onUpdateTabProperties.bind(this));

		fin.desktop.System.addEventListener("monitor-info-changed", this._onMonitorInfoChanged.bind(this));
	}

    /**
     * @private
     * @function _onMonitorInfoChanged For each group tab we realign all the apps when there is a change in monitor information
     */
	private async _onMonitorInfoChanged(): Promise<void> {
		this._service.tabGroups.forEach(group => {
			group.realignApps();
		});
	}

    /**
     * @private
     * @function _onUpdateTabProperties Updates the tab properties
     * @param message The new tab properties
     */
	private async _onUpdateTabProperties(message: TabPackage): Promise<void> {
		const tab = this._service.getTab({ ...message.tabID });

		if (tab && message.tabProps) {
			tab.updateTabProperties({ ...message.tabProps });
		}
	}

    /**
     * @private
     * @function _onClientInit Initialises tabbing on the application
     * @param message TabWindowOptions
     * @param uuid The uuid of the application to initialise tabbing on
     * @param name The name of the application to initialise tabbing on
     */
	private async _onClientInit(message: TabWindowOptions, uuid: string, name: string) {
		initializeTab(message, uuid, name, this._service);
	}

    /**
     * @private
     * @function _onTabEjected Eject tab when a message comes in based on the payload
     * @param message TabIdentifier and tab window options
     */
	private async _onTabEjected(message: TabIndentifier & TabWindowOptions) {
		ejectTab(this._service, message);
	}
}
