import { TabManager } from "./TabManager";

export class WindowManager {
	private static INSTANCE: WindowManager;
	public didGetDrop: boolean = false;
	public dragOverChecker!: NodeJS.Timer | null;
	private selfWindow!: fin.OpenFinWindow;

	constructor() {
		if (WindowManager.INSTANCE) {
			return WindowManager.INSTANCE;
		}

		this.selfWindow = fin.desktop.Window.getCurrent();
		this._setupListeners();

		WindowManager.INSTANCE = this;
	}

	public exit(): void {
		this.selfWindow.close();
	}

	public minimize(): void {
		this.selfWindow.minimize();
	}

	public maximize(): void {
		// this.selfWindow.maximize();
	}

	public popout(): void {
		// popout all windows
	}

	public centerTabWindow(window: fin.OpenFinWindow): void {
		window.getBounds((bounds: fin.WindowBounds) => {
			this.selfWindow.moveTo(bounds.left!, bounds.top! - 73);
			this.selfWindow.resizeTo(bounds.width!, 73, "top-left");
			window.joinGroup(this.window);
		});
	}

	public setDragBlock(): void {
		document.getElementById("drag-shield")!.style.display = "block";
	}

	public unsetDragBlock(): void {
		document.getElementById("drag-shield")!.style.display = "none";
	}

	private _setupListeners(): void {
		document.addEventListener("dragover", this._onDragOver.bind(this), false);
		document.addEventListener("dragleave", this._onDragLeave.bind(this), false);
		document.addEventListener("drop", this._onDragDrop.bind(this), false);
	}

	private _onDragLeave(e: DragEvent) {
		// @ts-ignore
		clearTimeout(this.dragOverChecker);
		// @ts-ignore
		this.dragOverChecker = setTimeout(() => {
			this.unsetDragBlock();
			this.dragOverChecker = null;
		}, 3000);

	}

	private _onDragOver(e: DragEvent) {

		if (e.preventDefault) {
			e.preventDefault(); // Necessary. Allows us to drop.
		  }

		  if(this.dragOverChecker) {
			  clearTimeout(this.dragOverChecker);
			  this.dragOverChecker = null;
		  }

		  e.dataTransfer.dropEffect = "copy";

		  this.setDragBlock();

		  return false;
	}

	private _onDragDrop(e: DragEvent) {
		if (e.stopPropagation) {
		e.stopPropagation(); // stops the browser from redirecting.
		}
		this.unsetDragBlock();
		this.didGetDrop = true;
		TabManager.instance.addTab(JSON.parse(e.dataTransfer.getData("tab")));

		return false;
	}

	public get window(): fin.OpenFinWindow {
		return this.selfWindow;
	}

	public static get instance(): WindowManager {
		if (WindowManager.INSTANCE) {
			return WindowManager.INSTANCE;
		} else {
			return new WindowManager();
		}
	}
}
