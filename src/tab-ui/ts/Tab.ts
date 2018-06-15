import { TabManager } from "./TabManager";

export interface TabIndentifier {
	name: string;
	uuid: string;
}

export class Tab {
	private window: fin.OpenFinWindow;
	private app: fin.OpenFinApplication;
	private domNode!: HTMLElement;
	private tabManager: TabManager = new TabManager();

	private tabContainer: HTMLElement = document.getElementById("tabs")!;

	constructor(tabID: TabIndentifier) {
		this.window = this._wrapWindow(tabID);
		this.app = this._wrapApplication(tabID);

		this._render();
	}

	public remove(): void {
		this.domNode.remove();
	}

	public setActive(): void {
		this.domNode.classList.add("active");
	}

	public unsetActive(): void {
		this.domNode.classList.remove("active");
	}

	private _render(): void {
		this.domNode = this._generateDOM();

		this.tabContainer.appendChild(this.domNode);
	}

	private _wrapWindow(tabID: TabIndentifier): fin.OpenFinWindow {
		return fin.desktop.Window.wrap(tabID.uuid, tabID.name);
	}

	private _wrapApplication(tabID: TabIndentifier): fin.OpenFinApplication {
		return fin.desktop.Application.wrap(tabID.uuid);
	}

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

	public get getAppUuid(): string {
		return this.app.uuid;
	}

	public get getWindowName(): string {
		return this.window.name;
	}

	public get DOM(): HTMLElement {
		return this.domNode;
	}
}
