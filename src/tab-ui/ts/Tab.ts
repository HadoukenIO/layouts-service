import { TabIdentifier, TabProperties } from "../../shared/types";
import { TabManager } from "./TabManager";

export class Tab {
	/**
	 * @member domNode Contains the HTML Element for the tab.
	 */
	private domNode!: HTMLElement;
	private _tabManager: TabManager;
	private _properties: TabProperties;
	private _ID: TabIdentifier;

	/**
	 * @constructor Constructor for the Tab class.
	 * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
	 */
	constructor(tabID: TabIdentifier, tabProperties: TabProperties, tabManager: TabManager) {
		this._ID = tabID;
		this._tabManager = tabManager;
		this._properties = tabProperties;
	}

	public async init() {
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
	 * @method updateIcon Updates the icon of this tab.
	 * @param icon The URL to the icon image.
	 */
	public updateIcon(icon: string = ""): void {
		const iconNode = this.domNode.querySelectorAll(".tab-favicon")[0];
		(iconNode as HTMLElement).style.backgroundImage = `url("${icon}")`;

		this._properties.icon = icon;
	}

	public updateText(text: string): void {
		const textNode = this.domNode.querySelectorAll(".tab-content")[0];
		(textNode as HTMLElement).textContent = text;

		this._properties.title = text;
	}
	/**
	 * Handles the HTML5 DragEvent onStart
	 * @param e {DragEvent} DragEvent
	 */
	private _onDragStart(e: DragEvent): void {
		e.dataTransfer.effectAllowed = "move";

		// @ts-ignore
		window.Tab.startDrag();
	}

	/**
	 * Handles the HTML5 DragEvent onDragEnd
	 * @param e {DragEvent} DragEvent
	 */
	private _onDragEnd(e: DragEvent): void {
		console.log(e);
		// @ts-ignore
		window.Tab.endDrag(e, this._ID.uuid, this._ID.name);
	}

	/**
	 * @method _render Renders the Tab to the DOM from generation.
	 */
	private _render(): void {
		this.domNode = this._generateDOM();
		TabManager.tabContainer.appendChild(this.domNode);
		this.updateText(this._properties.title!);
		this.updateIcon(this._properties.icon!);
	}

	/**
	 * @method _onClickHandler Handles all click events from this Tab DOM.
	 * @param e MouseEvent
	 */
	private _onClickHandler(e: MouseEvent): void {
		switch ((e.target as Element).className) {
			case "tab-exit": {
				// @ts-ignore
				window.Tab.closeTab(this._ID.uuid, this._ID.name);

				break;
			}
			default: {
				// @ts-ignore
				window.Tab.activateTab(this._ID.uuid, this._ID.name);
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

		return tab;
	}

	/**
	 * @method getTabID Creates a tab identifier object consisting of UUID, Name
	 * @returns {TabIdentifier} {uuid, name}
	 */
	public get ID(): TabIdentifier {
		return {
			uuid: this._ID.uuid,
			name: this._ID.name
		};
	}

	/**
	 * @method DOM
	 * @returns {HTMLElement}
	 */
	public get DOM(): HTMLElement {
		return this.domNode;
	}
}
