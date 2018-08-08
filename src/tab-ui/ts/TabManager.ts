import { TabbingApi } from "../../client/ts/TabbingApi";
import { TabApiEvents } from "../../shared/APITypes";
import { TabIdentifier, TabPackage, TabProperties } from "../../shared/types";
import { Tab } from "./Tab";
/**
 * Handles the management of tabs and some of their functionality.
 */
export class TabManager {
	/**
	 *  The HTML Element container for the tabs.
	 */
	public static tabContainer: HTMLElement = document.getElementById("tabs")!;

	/**
	 * Handle to the Tabbing API
	 */
	public static tabAPI: TabbingApi = new TabbingApi();

	/**
	 * An array of the tabs present in the window.
	 */
	private tabs: Tab[] = [];

	/**
	 * The currently active tab (highlighted).
	 */
	private activeTab!: Tab;

	/**
	 * The last active tab before the current active tab.
	 */
	private lastActiveTab!: Tab | null;

	/**
	 * Constructs the TabManager class.
	 */
	constructor() {
		TabManager.tabContainer = document.getElementById("tabs")!;
		this._setupListeners();
	}

	/**
	 * Creates a new Tab and renders.
	 * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public async addTab(tabID: TabIdentifier, tabProps: TabProperties) {
		if (this._getTabIndex(tabID) === -1) {
			const tab = new Tab(tabID, tabProps);
			await tab.init();

			this.tabs.push(tab);
		}
	}

	/**
	 * Removes a Tab.
	 * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public removeTab(tabID: TabIdentifier, closeApp: boolean = false): void {
		const index: number = this._getTabIndex(tabID);
		const tab: Tab | undefined = this.getTab(tabID);

		// if tab was found
		if (tab && index !== -1) {
			tab.remove();
			this.tabs.splice(index, 1);
		}
	}

	/**
	 * Unsets the active tab
	 * @method unsetActiveTab Removes the active status from the current active Tab.
	 */
	public unsetActiveTab(): void {
		if (!this.activeTab) {
			return;
		}

		this.activeTab.unsetActive();
	}

	/**
	 * Sets a specified tab as active.  If no tab is specified then the first tab will be chosen.
	 * @param {TabIdentifier | null} tabID An object containing the uuid, name for the external application/window or null.
	 */
	public setActiveTab(tabID: TabIdentifier | null = null): void {
		if (tabID) {
			const tab: Tab | undefined = this.getTab(tabID);

			if (tab) {
				if (tab !== this.activeTab) {
					this.lastActiveTab = this.activeTab;
					this.unsetActiveTab();
					tab.setActive();
					this.activeTab = tab;
				}
			}
		}
	}

	/**
	 * Finds and gets the Tab object.
	 * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public getTab(tabID: TabIdentifier): Tab | undefined {
		return this.tabs.find((tab: Tab) => {
			return tab.ID.name === tabID.name && tab.ID.uuid === tabID.uuid;
		});
	}

	/**
	 * Creates listeners for various IAB + Window Events.
	 */
	private _setupListeners(): void {
		TabManager.tabAPI.addEventListener(TabApiEvents.TABADDED, (tabInfo: TabPackage) => {
			console.log("TABADDED", tabInfo);
			this.addTab(tabInfo.tabID, tabInfo.tabProps!);
		});

		TabManager.tabAPI.addEventListener(TabApiEvents.TABREMOVED, (tabInfo: TabIdentifier) => {
			console.log("TABREMOVED", tabInfo);
			this.removeTab(tabInfo);
		});

		TabManager.tabAPI.addEventListener(TabApiEvents.TABACTIVATED, (tabInfo: TabIdentifier) => {
			console.log("TABACTIVATED", tabInfo);
			this.setActiveTab(tabInfo);
		});

		TabManager.tabAPI.addEventListener(TabApiEvents.PROPERTIESUPDATED, (tabInfo: TabPackage) => {
			console.log("TABPROPERTIESUPDATED", tabInfo);
			const tab = this.getTab(tabInfo.tabID);
			if (tab && tabInfo.tabProps) {
				if (tabInfo.tabProps.icon) {
					tab.updateIcon(tabInfo.tabProps.icon);
				}

				if (tabInfo.tabProps.title) {
					tab.updateText(tabInfo.tabProps.title);
				}
			}
		});
	}

	/**
	 * Gets the Tab index from the array.
	 * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	private _getTabIndex(tabID: TabIdentifier): number {
		return this.tabs.findIndex((tab: Tab) => {
			return tab.ID.name === tabID.name && tab.ID.uuid === tabID.uuid;
		});
	}

	/**
	 * Returns an array of all the tabs.
	 * @returns {Tab[]}
	 */
	public get getTabs(): Tab[] {
		return this.tabs;
	}

	/**
	 * Returns the last active tab.
	 * @returns {Tab | null} Last Active Tab
	 */
	public get getLastActiveTab(): Tab | null {
		return this.lastActiveTab;
	}

	/**
	 * Returns the active tab.
	 * @returns {Tab} Active Tab
	 */
	public get getActiveTab(): Tab {
		return this.activeTab;
	}
}
