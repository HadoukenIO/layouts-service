import { TabAPIActions, TabAPIInteractionMessage, TabAPIMessage, TabAPIWindowActions, TabPackage } from "../../shared/types";

import { Tab } from "./Tab";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";
import { ejectTab } from "./TabUtilities";

/**
 * @class Handles all calls from tab api to service
 */
export class TabAPIActionProcessor {
	/**
	 * @private
	 * @description The tab service itself
	 */
	private mTabService: TabService;

	/**
	 * @constructor Constructor for the TabAPIActionProcessor
	 */
	constructor(service: TabService) {
		this.mTabService = service;
	}

	/**
	 * @function init Initialises the TabAPIActionProcessor
	 */
	public init(): void {
		fin.desktop.InterApplicationBus.subscribe("*", "tab-api", this.process.bind(this));
	}

	/**
	 * @function process Processes the tab action
	 * @param message The payload the tab api sent
	 * @param uuid uuid of the sender
	 * @param name name of the sender
	 */
	private process(message: TabAPIMessage, uuid: string, name: string): void {
		const tabGroup: TabGroup | undefined = this.mTabService.getTabGroup(name);

		if (!tabGroup) {
			console.error("No tab group has been found wit hthe name");
			return;
		}

		switch (message.action) {
			case TabAPIActions.ADD:
				this.add(message as TabAPIInteractionMessage, tabGroup);
				break;
			case TabAPIActions.EJECT:
				this.eject(message as TabAPIInteractionMessage, tabGroup);
				break;
			case TabAPIActions.CLOSE:
				this.close(message as TabAPIInteractionMessage, tabGroup);
				break;
			case TabAPIWindowActions.MAXIMIZE:
				tabGroup.window.maximizeGroup();
				break;
			case TabAPIWindowActions.MINIMIZE:
				tabGroup.window.minimizeGroup();
				break;
			case TabAPIWindowActions.CLOSE:
				tabGroup.window.closeGroup();
				break;
			case TabAPIWindowActions.RESTORE:
				tabGroup.window.restoreGroup();
				break;
			case TabAPIActions.ACTIVATE:
				this.activate(message as TabAPIInteractionMessage, tabGroup);
				break;
			case TabAPIActions.UPDATEPROPERTIES:
				this.updateTabProperties(message as TabAPIInteractionMessage, tabGroup);
				break;
			default:
				break;
		}
	}

	/**
	 * @private
	 * @function add This adds an application to a tabgroup
	 * @param applicationToAttach The application to be attached
	 * @param tabGroup The tab group to attach the application to
	 */
	private async add(applicationToAttach: TabAPIInteractionMessage, tabGroup: TabGroup | undefined): Promise<void> {
		if (!applicationToAttach) {
			console.error("No application has been passed in");
			return;
		}

		if (!tabGroup) {
			console.error("No tab group has been passed in");
			return;
		}

		const tabPackage: TabPackage = {
			tabID: { uuid: applicationToAttach.uuid, name: applicationToAttach.name },
			tabProps: applicationToAttach.properties
		};

		const addedTab: Tab = await tabGroup.addTab(tabPackage);

		await addedTab.window.alignPositionToTabGroup();
	}

	/**
	 * @private
	 * @function eject Ejects a tab from tab group
	 * @param applicationToEject The application to eject from the tab group
	 * @param tabGroup The tab group to eject from
	 */
	private async eject(applicationToEject: TabAPIInteractionMessage, tabGroup: TabGroup | undefined): Promise<void> {
		if (!applicationToEject) {
			console.error("No application has been passed in");
			return;
		}

		if (!tabGroup) {
			console.error("No tab group has been passed in");
			return;
		}

		ejectTab(this.mTabService, { name: applicationToEject.name, uuid: applicationToEject.uuid }, tabGroup);
	}

	/**
	 * @private
	 * @function close Closes the tab and the application itself
	 * @param applicationToClose The application to close
	 * @param tabGroup The group the application is within
	 */
	private async close(applicationToClose: TabAPIInteractionMessage, tabGroup: TabGroup | undefined) {
		if (!applicationToClose) {
			console.error("No application has been passed in");
			return;
		}

		if (!tabGroup) {
			console.error("No tab group has been passed in");
			return;
		}

		const tab: Tab | undefined = tabGroup.getTab({ uuid: applicationToClose.uuid, name: applicationToClose.name });

		if (!tab) {
			console.error("No tab has been found with the identifier");
			return;
		}

		await tab.remove(true);
	}

	/**
	 * @private
	 * @function activate Activates the tab being selected and brings it to the front
	 * @param applicationToActivate The application to be activated
	 * @param tabGroup The tab group the application is in
	 */
	private async activate(applicationToActivate: TabAPIInteractionMessage, tabGroup: TabGroup | undefined) {
		if (!applicationToActivate) {
			console.error("No application has been passed in");
			return;
		}

		if (!tabGroup) {
			console.error("No tab group has been passed in");
			return;
		}

		await tabGroup.switchTab({ name: applicationToActivate.name, uuid: applicationToActivate.uuid });
	}

	/**
	 * @private
	 * @function updateTabProperties Updates the properties of the tab
	 * @param tabToUpdate Holds information about the tab to update and its new properties
	 * @param tabGroup The group the tab is in
	 */
	private async updateTabProperties(tabToUpdate: TabAPIInteractionMessage, tabGroup: TabGroup | undefined) {
		if (!tabToUpdate) {
			console.error("No tab to update has beed passed in");
			return;
		}

		if (!tabGroup) {
			console.error("No tab group has been passed in");
			return;
		}

		if (!tabToUpdate.properties) {
			console.error("No tab properties to update");
			return;
		}

		const tab: Tab | undefined = tabGroup.getTab({ uuid: tabToUpdate.uuid, name: tabToUpdate.name });

		if (!tab) {
			console.error("No tab has been found");
			return;
		}

		tab.updateTabProperties(tabToUpdate.properties);
	}
}
