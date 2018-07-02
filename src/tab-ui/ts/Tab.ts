import { DragWindowManager } from "../../service/ts/DragWindowManager";
import { ExternalApplication } from "./ExternalApplication";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";

export interface TabIndentifier {
	name: string;
	uuid: string;
}

export interface TabOptions {
	alignTabWindow?: boolean;
	screenX?: number;
	screenY?: number;
}

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

	public updateIcon(icon: string = ""): void {
		const iconNode = this.domNode.querySelectorAll(".tab-favicon")[0];
		(iconNode as HTMLElement).style.backgroundImage = `url("${icon}")`;
	}

	private _onDragStart(e: DragEvent): void {
		const tabID: TabIndentifier = this.getTabId;
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", JSON.stringify(tabID));

		DragWindowManager.show();
		this.externalApplication.getWindow.leaveGroup();
		WindowManager.instance.setDidGetDrop = false;
	}

	private _onDragEnd(e: DragEvent): void {
		const tabID: TabIndentifier = this.getTabId;

		DragWindowManager.hide();
		// WindowManager.instance.unsetDragBlock();
		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, "tab-ejected", { ...this.getTabId, screenX: e.screenX, screenY: e.screenY });
		TabManager.instance.removeTab(tabID, false);
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
		const tabTemplate: HTMLTemplateElement = (document.getElementById("tab-template") as HTMLTemplateElement)!; // .firstElementChild!.cloneNode(true) as HTMLElement;
		const tabTemplateDocFrag: DocumentFragment = document.importNode(tabTemplate.content, true);
		const tab: HTMLElement = tabTemplateDocFrag.firstElementChild as HTMLElement;

		tab.onclick = this._onClickHandler.bind(this);
		tab.addEventListener("dragstart", this._onDragStart.bind(this), false);
		tab.addEventListener("dragend", this._onDragEnd.bind(this), false);

		const tabText = tab.querySelectorAll(".tab-content")[0];
		tabText.textContent = this.externalApplication.getWindow.name;

		const tabFavicon: HTMLElement = tab.querySelectorAll(".tab-favicon")[0] as HTMLElement;

		return tab;
	}

	public get getTabId(): TabIndentifier {
		return {
			uuid: this.externalApplication.getApplication.uuid,
			name: this.externalApplication.getWindow.name
		};
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
