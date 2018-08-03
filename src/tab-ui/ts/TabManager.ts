import { TabApiEvents, TabIndentifier, TabPackage, TabProperties } from "../../shared/types";
import { Tab } from "./Tab";
/**
 * @class TabManager Handles the management of individual tabs and some of their functionality.
 */
export class TabManager {
	/**
	 * @method tabContainer The HTML Element container for the tabs.
	 */
	public static tabContainer: HTMLElement = document.getElementById("tabs")!;

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
		TabManager.tabContainer = document.getElementById("tabs")!;
		this._setupListeners();
	}

	/**
	 * @method addTab Creates a new Tab and renders.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public async addTab(tabID: TabIndentifier, tabProps: TabProperties) {
		if (this._getTabIndex(tabID) === -1) {
			const tab = new Tab(tabID, tabProps, this);
			await tab.init();

			this.tabs.push(tab);
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
			tab.remove();
			this.tabs.splice(index, 1);
		}
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
					this.unsetActiveTab();
					tab.setActive();
					this.activeTab = tab;
				}
			}
		}
	}

	/**
	 * @method getTab Finds and gets the Tab object.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	public getTab(tabID: TabIndentifier): Tab | undefined {
		return this.tabs.find((tab: Tab) => {
			return tab.ID.name === tabID.name && tab.ID.uuid === tabID.uuid;
		});
	}

	/**
	 * Creates listeners for various IAB + Window Events.
	 */
	private _setupListeners(): void {
		// @ts-ignore
		window.Tab.addEventListener(TabApiEvents.TABADDED, (tabInfo: TabPackage) => {
			console.log("TABADDED", tabInfo);
			this.addTab(tabInfo.tabID, tabInfo.tabProps!);
		});

		// @ts-ignore
		window.Tab.addEventListener(TabApiEvents.TABREMOVED, (tabInfo: TabIndentifier) => {
			console.log("TABREMOVED", tabInfo);
			this.removeTab(tabInfo);
		});

		// @ts-ignore
		window.Tab.addEventListener(TabApiEvents.TABACTIVATED, (tabInfo: TabIndentifier) => {
			console.log("TABACTIVATED", tabInfo);
			this.setActiveTab(tabInfo);
		});

		// @ts-ignore
		window.Tab.addEventListener(TabApiEvents.PROPERTIESUPDATED, (tabInfo: TabPackage) => {
			console.log("TABPROPERTIESUPDATED", tabInfo);
			const tab = this.getTab(tabInfo.tabID);
			if (tabInfo.tabProps) {
				if (tabInfo.tabProps.icon) {
					// @ts-ignore
					tab.updateIcon(tabInfo.tabProps.icon);
				}

				if (tabInfo.tabProps.title) {
					// @ts-ignore
					tab.updateText(tabInfo.tabProps.title);
				}
			}
		});
	}

	/**
	 * @method _getTabIndex Gets the Tab index from the array.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	private _getTabIndex(tabID: TabIndentifier): number {
		return this.tabs.findIndex((tab: Tab) => {
			return tab.ID.name === tabID.name && tab.ID.uuid === tabID.uuid;
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
}
