import { DragWindowManager } from "../../service/ts/DragWindowManager";
import { EjectTriggers, TabIndentifier, TabOptions } from "../../shared/types";
import { ExternalApplication } from "./ExternalApplication";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";

export class Tab {
	private externalApplication: ExternalApplication;

	/**
	 * @member domNode Contains the HTML Element for the tab.
	 */
	private domNode!: HTMLElement;

	/**
	 * @constructor Constructor for the Tab class.
	 * @param {TabIndentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	constructor(tabID: TabIndentifier & TabOptions, alignTabWindow: boolean = false) {
		this.externalApplication = new ExternalApplication(tabID, this);

		this._render();
	}

	/**
	 * @method remove Removes the Tab from DOM.
	 */
	public remove(removeApp: boolean): void {
		this.externalApplication.getWindow.leaveGroup();
		this.domNode.remove();

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

	/**
	 * @method updateIcon Updates the icon of this tab.
	 * @param icon The URL to the icon image.
	 */
	public updateIcon(icon: string = ""): void {
		const iconNode = this.domNode.querySelectorAll(".tab-favicon")[0];
		(iconNode as HTMLElement).style.backgroundImage = `url("${icon}")`;
	}
	/**
	 * Handles the HTML5 DragEvent onStart
	 * @param e {DragEvent} DragEvent
	 */
	private _onDragStart(e: DragEvent): void {
		e.dataTransfer.effectAllowed = "move";

		DragWindowManager.show();
		this.externalApplication.getWindow.leaveGroup();
		WindowManager.instance.setDidGetDrop = false;
	}

	/**
	 * Handles the HTML5 DragEvent onDragEnd
	 * @param e {DragEvent} DragEvent
	 */
	private _onDragEnd(e: DragEvent): void {
		this.getExternalApplication.getWindow.getBounds(bounds => {
			TabManager.instance.ejectTab(this.getTabId, EjectTriggers.DRAG, e.screenX, e.screenY, bounds.width, bounds.height);
		});

		DragWindowManager.hide();
	}

	/**
	 * @method _render Renders the Tab to the DOM from generation.
	 */
	private _render(): void {
		this.domNode = this._generateDOM();
		TabManager.tabContainer.appendChild(this.domNode);
	}

	/**
	 * @method _onClickHandler Handles all click events from this Tab DOM.
	 * @param e MouseEvent
	 */
	private _onClickHandler(e: MouseEvent): void {
		switch ((e.target as Element).className) {
			case "tab-exit": {
				TabManager.instance.removeTab(
					{
						name: this.externalApplication.getWindow.name,
						uuid: this.externalApplication.getApplication.uuid
					},
					true
				);

				break;
			}
			default: {
				TabManager.instance.setActiveTab({
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
		// Get tab template from HTML (index.html)
		const tabTemplate: HTMLTemplateElement = (document.getElementById("tab-template") as HTMLTemplateElement)!;
		const tabTemplateDocFrag: DocumentFragment = document.importNode(tabTemplate.content, true);
		const tab: HTMLElement = tabTemplateDocFrag.firstElementChild as HTMLElement;

		// Set the onclick, drag events to top tab DOM.
		tab.onclick = this._onClickHandler.bind(this);
		tab.addEventListener("dragstart", this._onDragStart.bind(this), false);
		tab.addEventListener("dragend", this._onDragEnd.bind(this), false);

		// Sets Tab Text
		const tabText = tab.querySelectorAll(".tab-content")[0];
		tabText.textContent = this.externalApplication.getWindow.name;

		return tab;
	}

	/**
	 * @method getTabID Creates a tab identifier object consisting of UUID, Name
	 * @returns {TabIndentifier} {uuid, name}
	 */
	public get getTabId(): TabIndentifier {
		return {
			uuid: this.externalApplication.getApplication.uuid,
			name: this.externalApplication.getWindow.name
		};
	}

	/**
	 * Gets the Tabs External Application (the application window to which it is attached).
	 * @returns {ExternalApplication} ExternalApplication
	 */
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
