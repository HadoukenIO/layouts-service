export class DragWindowManager {
	public static show(): void {
		fin.desktop.InterApplicationBus.send(DragWindowManager.application.uuid, "DragManager:Show", {});
	}

	public static hide(): void {
		fin.desktop.InterApplicationBus.send(DragWindowManager.application.uuid, "DragManager:Hide", {});
	}

	private static application = fin.desktop.Application.getCurrent();

	private window: fin.OpenFinWindow;

	// tslint:disable-next-line:no-any
	private mouseTrackerInterval: any;

	constructor() {
		this.window = this._createDragWindow();
		this._setupListeners();
	}

	private _createDragWindow(): fin.OpenFinWindow {
		const win = new fin.desktop.Window(
			{
				name: "TabbingDragWindow",
				url: "http://localhost:9001/tab-ui/drag.html",
				defaultHeight: 1,
				defaultWidth: 1,
				saveWindowState: false,
				autoShow: true,
				opacity: 0.01,
				frame: false,
				waitForPageLoad: false,
				alwaysOnTop: true
			},
			() => {
				win.hide();
				win.resizeTo(1000, 1000, "top-left");
			}
		);

		return win;
	}

	private _setWindowToMouse(set: boolean): void {
		if (set) {
			this.mouseTrackerInterval = setInterval(() => {
				fin.desktop.System.getMousePosition(mousePosition => {
					this.window.moveTo(mousePosition.left - 500, mousePosition.top - 500);
					fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, "tab-ping", { screenX: mousePosition.left, screenY: mousePosition.top });
				});
			}, 25);
		} else {
			clearInterval(this.mouseTrackerInterval);
		}
	}

	private _setupListeners(): void {
		fin.desktop.InterApplicationBus.subscribe(DragWindowManager.application.uuid, "DragManager:Hide", () => {
			this.window.hide();
			this._setWindowToMouse(false);
		});

		fin.desktop.InterApplicationBus.subscribe(DragWindowManager.application.uuid, "DragManager:Show", () => {
			this.window.show();
			this._setWindowToMouse(true);
		});
	}

	public get getWindow(): fin.OpenFinWindow {
		return this.window;
	}
}
