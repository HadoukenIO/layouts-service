import { SaveAndRestoreActions, SaveAndRestoreEvents } from "../../shared/APITypes";
import { TabBlob, TabIdentifier } from "../../shared/types";
import { Tab } from "./Tab";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";

/**
 * Handles all calls from tab api to service
 */
export class SaveAndRestoreAPIProcessor {
	/**
	 * The tab service itself
	 */
	private mTabService: TabService;

	/**
	 * @constructor Constructor for the SaveAndRestoreAPIProcessor
	 */
	constructor(service: TabService) {
		this.mTabService = service;
	}

	/**
	 * Initialises the SaveAndRestoreAPIProcessor
	 */
	public init(): void {
		fin.desktop.InterApplicationBus.subscribe("*", "SAR-API", this.process.bind(this));
	}

	/**
	 * Processes incoming API messages from the Tab API.
	 * @param message The payload the tab api sent
	 * @param uuid uuid of the sender
	 * @param name name of the sender
	 */
	private process(message: { action: SaveAndRestoreActions }, uuid: string, name: string): void {
		switch (message.action) {
			case SaveAndRestoreActions.GETBLOB: {
				this._onGetBlob(uuid, name);
				break;
			}
			default:
				console.error(message.action, " Not Implemented!");
				break;
		}
	}

	/**
	 * Gathers information from tab sets and their tabs, and returns as a JSON object back to the requesting application/window.
	 * @param uuid Uuid of the requesting Application
	 * @param name Name of the requesting window
	 */
	private async _onGetBlob(uuid: string, name: string): Promise<void> {
		const tabBlobs: TabBlob[] = await Promise.all(
			this.mTabService.tabGroups.map(async (group: TabGroup) => {
				const tabs: TabIdentifier[] = group.tabs.map((tab: Tab) => {
					return tab.ID;
				});

				const [groupBounds, appBounds] = await Promise.all([group.window.getWindowBounds(), group.activeTab.window.getWindowBounds()]);

				const groupInfo = {
					url: group.window.initialWindowOptions.url!,
					active: group.activeTab.ID,
					dimensions: {
						x: groupBounds.left!,
						y: groupBounds.top!,
						width: groupBounds.width!,
						setHeight: groupBounds.height!,
						appHeight: appBounds.height!
					}
				};

				return { tabs, groupInfo };
			})
		);

		fin.desktop.InterApplicationBus.send(uuid, name, SaveAndRestoreEvents.GETBLOBRETURN, tabBlobs);
	}
}
