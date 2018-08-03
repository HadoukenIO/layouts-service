import { AppApiEvents, ServiceIABTopics, TabIndentifier, TabPackage, TabProperties, TabWindowOptions } from "../../shared/types";
import { TabGroup } from "./TabGroup";
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
		fin.desktop.InterApplicationBus.subscribe("*", AppApiEvents.CLIENTINIT, this._onClientInit.bind(this));
		fin.desktop.InterApplicationBus.subscribe("*", AppApiEvents.DEREGISTER, this._onClientDeregister.bind(this));

		fin.desktop.System.addEventListener("monitor-info-changed", this._onMonitorInfoChanged.bind(this));
	}

	/**
	 * @private
	 * @function _onMonitorInfoChanged For each group tab we realign all the apps when there is a change in monitor information
	 */
	private async _onMonitorInfoChanged(): Promise<void> {
		this._service.tabGroups.forEach((group: TabGroup) => {
			group.realignApps();
		});
	}

	/**
	 * @private
	 * @function _onClientInit Initialises tabbing on the application
	 * @param message TabWindowOptions
	 * @param uuid The uuid of the application to initialise tabbing on
	 * @param name The name of the application to initialise tabbing on
	 */
	private async _onClientInit(message: TabWindowOptions, uuid: string, name: string): Promise<void> {
		initializeTab(message, uuid, name, this._service);
	}

	private async _onClientDeregister(message: {}, uuid: string, name: string) {
		const tabGroup = this._service.getTabGroupByApp({ uuid, name });

		if (tabGroup) {
			tabGroup.deregisterTab({ uuid, name });
		}
	}
}
