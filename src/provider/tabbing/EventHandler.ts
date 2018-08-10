import { AppApiEvents } from "../../shared/APITypes";
import { TabWindowOptions } from "../../shared/types";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";
import { initializeTabbing } from "./TabUtilities";

// tslint:disable-next-line:no-any
declare var fin: any;
/**
 * @class Handles events coming from the application
 */
export class EventHandler {
	/**
	 * Handle to the TabService
	 */
	private _service: TabService;

	/**
	 * Constructor for the Event handler class
	 * @param {TabService} service Tab service
	 */
	constructor(service: TabService) {
		this._service = service;

		this._createListeners();
	}

	/**
	 * Subscribes to topics and handles messages coming into those topics
	 */
	private async _createListeners(): Promise<void> {
		fin.desktop.InterApplicationBus.subscribe("*", AppApiEvents.CLIENTINIT, this._onClientInit.bind(this));
		fin.desktop.InterApplicationBus.subscribe("*", AppApiEvents.DEREGISTER, this._onClientDeregister.bind(this));

		fin.desktop.System.addEventListener("monitor-info-changed", this._onMonitorInfoChanged.bind(this));
	}

	/**
	 * For each group tab we realign all the apps when there is a change in monitor information
	 */
	private async _onMonitorInfoChanged(): Promise<void> {
		this._service.tabGroups.forEach((group: TabGroup) => {
			group.realignApps();
		});
	}

	/**
	 * Initialises tabbing on the application
	 * @param message TabWindowOptions
	 * @param uuid The uuid of the application to initialise tabbing on
	 * @param name The name of the application to initialise tabbing on
	 */
	private async _onClientInit(message: TabWindowOptions, uuid: string, name: string): Promise<void> {
		initializeTabbing(message, uuid, name, this._service);
	}

	/**
	 * Deregisters the window from tabbing.
	 * @param {} message None.
	 * @param {string} uuid The uuid of the application to deregister.
	 * @param {string} name The name of the application to deregister.
	 */
	private async _onClientDeregister(message: {}, uuid: string, name: string) {
		const tabGroup = this._service.getTabGroupByApp({ uuid, name });

		if (tabGroup) {
			tabGroup.deregisterTab({ uuid, name });
		}
	}
}
