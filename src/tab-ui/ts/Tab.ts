import { ExternalApplication } from "./ExternalApplication";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";

export interface TabIndentifier {
	name: string;
	uuid: string;
}

export class Tab {
	private externalApplication: ExternalApplication;

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
		this.externalApplication = new ExternalApplication(tabID, this);

		this._render();
	}

	/**
	 * @method remove Removes the Tab from DOM.
	 */
	public remove(removeApp: boolean): void {
		this.domNode.remove();
		this.externalApplication.getWindow.leaveGroup();

		if (removeApp) {
			this.externalApplication.getWindow.close(true);
		}
	}


	/**
	 * @method setActive Sets the Active class on the Tab DOM.
	 */
	public setActive(): void {
		this.domNode.classList.add("active");
		this.externalApplication.show();
	}

	/**
	 * @method unsetActive Removes the Active class from the Tab DOM.
	 */
	public unsetActive(): void {
		this.domNode.classList.remove("active");
		this.externalApplication.hide();
	}

	private _onDragStart(e: DragEvent): void {
		// tslint:disable-next-line:no-console
		const tabID: TabIndentifier = this.getTabId;
		e.dataTransfer.effectAllowed = "all";
		e.dataTransfer.setData("tab", JSON.stringify(tabID));

		this.externalApplication.getWindow.leaveGroup();
	}

	private _onDragEnd(e: DragEvent): void {
		const tabID: TabIndentifier = this.getTabId;

		if (!WindowManager.instance.didGetDrop) {
			this.tabManager.removeTab(tabID);
		} else {
			this.externalApplication.alignAppWindow();
			WindowManager.instance.didGetDrop = false;
		}

		WindowManager.instance.setDragBlock();
	}

	/**
	 * @method _render Renders the Tab to the DOM from generation.
	 */
	private _render(): void {
		this.domNode = this._generateDOM();

		this.tabContainer.appendChild(this.domNode);
	}

	/**
	 * @method _onClickHandler Handles all click events from this Tab DOM.
	 * @param e MouseEvent
	 */
	private _onClickHandler(e: MouseEvent): void {
		switch ((e.target as Element).className) {
			case "tab-exit": {
				this.tabManager.removeTab({
					name: this.externalApplication.getWindow.name,
					uuid: this.externalApplication.getApplication.uuid
				}, true);

				break;
			}
			default: {
				this.tabManager.setActiveTab({
					name: this.externalApplication.getWindow.name,
					uuid: this.externalApplication.getApplication.uuid
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
		tabWrapper.setAttribute("draggable", "true");
		tabWrapper.onclick = this._onClickHandler.bind(this);
		tabWrapper.addEventListener(
			"dragstart",
			this._onDragStart.bind(this),
			false
		);
		tabWrapper.addEventListener("dragend", this._onDragEnd.bind(this), false);

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
		tabContent.textContent = this.externalApplication.getWindow.name;

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

	public get getTabId(): TabIndentifier {
		return { uuid: this.externalApplication.getApplication.uuid, name: this.externalApplication.getWindow.name };
	}

	public get getExternalApplication(): ExternalApplication {
		return this.externalApplication;
	}


	/**
	 * @method DOM
	 * @returns {HTMLElement}
	 */
	public get DOM(): HTMLElement {
		return this.domNode;
	}
}
