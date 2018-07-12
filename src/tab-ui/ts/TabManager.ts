import { ClientIABTopics, EjectTriggers, TabIndentifier, TabOptions } from "../../shared/types";
import * as Utils from "../../shared/utils";
import { Tab } from "./Tab";
import { WindowManager } from "./WindowManager";
/**
 * @class TabManager Handles the management of individual tabs and some of their functionality.
 */
export class TabManager {
	/**
	 * @method tabContainer The HTML Element container for the tabs.
	 */
	public static tabContainer: HTMLElement = document.getElementById("tabs")!;

	/**
	 * @member INSTANCE Holds the instance for the class.
	 */
	private static INSTANCE: TabManager;

	/**
	 * @member tabs An array of the tabs present in the window.
	 */
	private tabs: Tab[] = [];

	/**
	 * @member activeTab The currently active tab (highlighted).
	 */
	private activeTab!: Tab;

	private lastActiveTab!: Tab | null;

	/**
	 * @constructor Constructs the TabManager class.
	 */
	constructor() {
		console.log("in tab manager");
		if (TabManager.INSTANCE) {
			console.log("in tab manager", TabManager.INSTANCE);
			return TabManager.INSTANCE;
		}
		TabManager.tabContainer = document.getElementById("tabs")!;
		this._setupListeners();

		TabManager.INSTANCE = this;
		console.log("end tab manager", this);
	}

	/**
	 * @method addTab Creates a new Tab and renders.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public async addTab(tabID: TabIndentifier & TabOptions) {
		if (this._getTabIndex(tabID) === -1) {
			const tab = new Tab(tabID);
			await tab.init();

			fin.desktop.InterApplicationBus.send(tabID.uuid, tabID.name, "TABBED", {});

			this.tabs.push(tab);

			this.setActiveTab(tabID);
		}
	}

	/**
	 * @method removeTab Removes a Tab.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public removeTab(tabID: TabIndentifier, closeApp: boolean = false): void {
		const index: number = this._getTabIndex(tabID);
		const tab: Tab | undefined = this.getTab(tabID);

		// if tab was found
		if (tab && index !== -1) {
			tab.remove(closeApp);
			fin.desktop.InterApplicationBus.send(tabID.uuid, tabID.name, "UNTABBED", {});
			this.tabs.splice(index, 1);

			// is the tab being removed the active tab?
			if (this.activeTab === tab) {
				this.unsetActiveTab();
				this.setActiveTab();
			}

			// if there are no more tabs then close the window.
			if (this.tabs.length === 0) {
				WindowManager.instance.exit();
			}
		}
	}

	/**
	 * Removes all tabs from the tab group.
	 */
	public removeAllTabs(): void {
		this.tabs.slice().forEach(tab => {
			this.removeTab(tab.getTabId, true);
		});
	}

	/**
	 * @method unsetActiveTab Removes the active status from the current active Tab.
	 */
	public unsetActiveTab(): void {
		if (!this.activeTab) {
			return;
		}

		this.activeTab.unsetActive();
	}

	/**
	 * @method setActive Sets a specified tab as active.  If no tab is specified then the first tab will be chosen.
	 * @param {TabIndentifier | null} tabID An object containing the uuid, name for the external application/window or null.
	 */
	public setActiveTab(tabID: TabIndentifier | null = null): void {
		if (tabID) {
			const tab: Tab | undefined = this.getTab(tabID);

			if (tab) {
				if (tab !== this.activeTab) {
					this.lastActiveTab = this.activeTab;
					tab.getExternalApplication.show();
					this.unsetActiveTab();
					tab.setActive();
					this.activeTab = tab;
				}
			} else {
				tabID = null;
			}
		}

		if (!tabID) {
			if (this.tabs.length > 0) {
				this.setActiveTab({
					name: this.tabs[0].getExternalApplication.getWindow.name,
					uuid: this.tabs[0].getExternalApplication.getApplication.uuid
				});
			}
		}
	}

	/**
	 * @method getTab Finds and gets the Tab object.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public getTab(tabID: TabIndentifier): Tab | undefined {
		return this.tabs.find((tab: Tab) => {
			return tab.getExternalApplication.getWindow.name === tabID.name && tab.getExternalApplication.getApplication.uuid === tabID.uuid;
		});
	}

	/**
	 * Realigns all the Tabs External Applications to this window.  Useful if the tab window and apps are not lined up.
	 */
	public realignApps(): void {
		this.tabs.forEach(tab => {
			tab.getExternalApplication.alignAppWindow();
		});
	}

	/**
	 * Ejects a tab from the tab window.
	 * @param tabID {TabIdentifier} The TabIndentifier of the tab to be ejected.
	 * @param trigger The trigger type of the eject event.
	 * @param screenX Optional.  The screen X coord to eject the tab to. Default 100.
	 * @param screenY Optional.  The screen Y coord to eject the tab to. Default 100.
	 * @param width Optional.  The width of the window once ejected.  Default current width.
	 * @param height Optional.  The height of the new window once ejected.  Default current height.
	 */
	public ejectTab(tabID: TabIndentifier, trigger: EjectTriggers, screenX: number = 100, screenY: number = 100, width: number | null = null, height: number | null = null) {
		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, "tab-ejected", { ...tabID, screenX, screenY, trigger, width, height });
		TabManager.instance.removeTab(tabID, false);
	}

	/**
	 * Creates listeners for various IAB + Window Events.
	 */
	private _setupListeners(): void {
		// Responds to tab window discovery events.  Used when we need to find what tab window contains an application.
		fin.desktop.InterApplicationBus.subscribe("*", ClientIABTopics.DISCOVER, (message: TabIndentifier, uuid, name) => {
			if (this.getTab(message)) {
				// If we have the searched for application then we reply back to the sending tab window with our info.
				fin.desktop.InterApplicationBus.send(uuid, name, ClientIABTopics.DISCOVERRETURN, { uuid: fin.desktop.Application.getCurrent().uuid, name: fin.desktop.Window.getCurrent().name });
			}
		});

		// Listens for a tab eject API request.
		fin.desktop.InterApplicationBus.subscribe("*", ClientIABTopics.EJECTREQUEST, (message: TabIndentifier, uuid, name) => {
			const tab = this.getTab(message);

			if (tab) {
				this.ejectTab(message, EjectTriggers.API, tab.getExternalApplication.getInitialBounds.left, tab.getExternalApplication.getInitialBounds.top);
			}
		});

		// Listens for update Icon API request.
		fin.desktop.InterApplicationBus.subscribe("*", ClientIABTopics.CHANGEICON, (message: TabIndentifier & { icon: string }, uuid, name) => {
			const tab = this.getTab(message);

			if (tab) {
				tab.updateIcon(message.icon);
			}
		});

		// Listens + Responds for a join request.  This can be a tab joining our tab group, or a request for one of our tabs to join another.
		fin.desktop.InterApplicationBus.subscribe("*", ClientIABTopics.JOINREQUEST, async (message: TabIndentifier & { extUuid: string; extName: string }) => {
			const requestingWindowTabs = await Utils.getTabWindow({ uuid: message.uuid, name: message.name });
			if (requestingWindowTabs) {
				fin.desktop.InterApplicationBus.send(requestingWindowTabs.uuid, requestingWindowTabs.name, "add-tab", { uuid: message.extUuid, name: message.extName });
			}
			this.removeTab({ uuid: message.extUuid, name: message.extName }, false);
		});
	}

	/**
	 * @method _getTabIndex Gets the Tab index from the array.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	private _getTabIndex(tabID: TabIndentifier): number {
		return this.tabs.findIndex((tab: Tab) => {
			return tab.getExternalApplication.getWindow.name === tabID.name && tab.getExternalApplication.getApplication.uuid === tabID.uuid;
		});
	}

	/**
	 * @method getTabs Returns an array of all the tabs.
	 * @returns {Tab[]}
	 */
	public get getTabs(): Tab[] {
		return this.tabs;
	}

	public get getLastActiveTab(): Tab | null {
		return this.lastActiveTab;
	}

	public get getActiveTab(): Tab {
		return this.activeTab;
	}

	/**
	 * @method instance Returns the instance for the class.
	 */
	public static get instance() {
		if (TabManager.INSTANCE) {
			return TabManager.INSTANCE;
		} else {
			return new TabManager();
		}
	}
}
