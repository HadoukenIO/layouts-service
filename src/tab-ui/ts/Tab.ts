import { TabManager } from "./TabManager";

export interface TabIndentifier {
	name: string;
	uuid: string;
}

export class Tab {
	/**
	 * @member window Contains the window object for this applicaiton tab.
	 */
	private window: fin.OpenFinWindow;

	/**
	 * @member app Contains the application object for this application tab.
	 */
	private app: fin.OpenFinApplication;

	/**
	 * @member domNode Contains the HTML Element for the tab.
	 */
	private domNode!: HTMLElement;

	/**
	 * @member tabManager Contains the tabManager reference.
	 */
	private tabManager: TabManager = new TabManager();

	/**
	 * @member tabContainer Contains the HTML Element for the tab container.
	 */
	private tabContainer: HTMLElement = document.getElementById("tabs")!;

	/**
	 * @constructor Constructor for the Tab class.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	constructor(tabID: TabIndentifier) {
		this.window = this._wrapWindow(tabID);
		this.app = this._wrapApplication(tabID);

		this._render();
	}

	/**
	 * @method remove Removes the Tab from DOM.
	 */
	public remove(): void {
		this.domNode.remove();
	}

	/**
	 * @method setActive Sets the Active class on the Tab DOM.
	 */
	public setActive(): void {
		this.domNode.classList.add("active");
	}

	/**
	 * @method unsetActive Removes the Active class from the Tab DOM.
	 */
	public unsetActive(): void {
		this.domNode.classList.remove("active");
	}

	/**
	 * @method _render Renders the Tab to the DOM from generation.
	 */
	private _render(): void {
		this.domNode = this._generateDOM();

		this.tabContainer.appendChild(this.domNode);
	}

	/**
	 * @method _wrapWindow Wraps the openfin Window object for this application tab.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	private _wrapWindow(tabID: TabIndentifier): fin.OpenFinWindow {
		return fin.desktop.Window.wrap(tabID.uuid, tabID.name);
	}

	/**
	 * @method _wrapApplication Wraps the openfin Application object for this application tab.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	private _wrapApplication(tabID: TabIndentifier): fin.OpenFinApplication {
		return fin.desktop.Application.wrap(tabID.uuid);
	}

	/**
	 * @method _onClickHandler Handles all click events from this Tab DOM.
	 * @param e MouseEvent
	 */
	private _onClickHandler(e: MouseEvent): void {
		switch ((e.target as Element).className) {
			case "tab-exit": {
				this.tabManager.removeTab({
					name: this.getWindowName,
					uuid: this.getAppUuid
				});

				break;
			}
			default: {
				this.tabManager.setActiveTab({
					name: this.getWindowName,
					uuid: this.getAppUuid
				});
			}
		}
	}

	/**
	 * @method _generateDOM Generates the DOM for this tab.
	 * @returns {HTMLElement}
	 */
	private _generateDOM(): HTMLElement {
		const tabWrapper: HTMLElement = document.createElement("div");
		tabWrapper.className = "tab";
		tabWrapper.onclick = this._onClickHandler.bind(this);

		const tabLeft: HTMLElement = document.createElement("div");
		tabLeft.className = "tab-left";

		const tabLeftOverlay: HTMLElement = document.createElement("div");
		tabLeftOverlay.className = "tab-left-overlay";

		const tabContentWrap: HTMLElement = document.createElement("div");
		tabContentWrap.className = "tab-content-wrap";

		const tabFavicon: HTMLElement = document.createElement("div");
		tabFavicon.className = "tab-favicon";

		const tabContent: HTMLElement = document.createElement("div");
		tabContent.className = "tab-content";
		tabContent.textContent = this.window.name;

		const tabExit: HTMLElement = document.createElement("div");
		tabExit.className = "tab-exit";

		const tabRight: HTMLElement = document.createElement("div");
		tabRight.className = "tab-right";

		const tabRightOverlay: HTMLElement = document.createElement("div");
		tabRightOverlay.className = "tab-right-overlay";

		tabLeft.appendChild(tabLeftOverlay);
		tabRight.appendChild(tabRightOverlay);

		tabContentWrap.appendChild(tabFavicon);
		tabContentWrap.appendChild(tabContent);
		tabContentWrap.appendChild(tabExit);

		tabWrapper.appendChild(tabLeft);
		tabWrapper.appendChild(tabContentWrap);
		tabWrapper.appendChild(tabRight);

		return tabWrapper;
	}

	/**
	 * @method getAppUuid Returns the App UUID for this tab.
	 * @returns {string}
	 */
	public get getAppUuid(): string {
		return this.app.uuid;
	}

	/**
	 * @method getWindowName Returns the Window name for this tab.
	 * @returns {string}
	 */
	public get getWindowName(): string {
		return this.window.name;
	}

	/**
	 * @method DOM
	 * @returns {HTMLElement}
	 */
	public get DOM(): HTMLElement {
		return this.domNode;
	}
}
