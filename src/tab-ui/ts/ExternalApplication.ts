import {  Tab, TabIndentifier } from "./Tab";
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";

export class ExternalApplication {
    private application: fin.OpenFinApplication;
    private window: fin.OpenFinWindow;
    private tabManager: TabManager = new TabManager();

    constructor(tabID: TabIndentifier, tab: Tab) {
        this.application = fin.desktop.Application.wrap(tabID.uuid);
        this.window = fin.desktop.Window.wrap(tabID.uuid, tabID.name);

        this.window.updateOptions({frame: false, taskbarIconGroup: fin.desktop.Application.getCurrent().uuid});

        if (this.tabManager.getTabs.length === 0) {
			WindowManager.instance.centerTabWindow(this.window);
		} else {
			this.alignAppWindow();
		}
    }

    public hide(): void {
		this.window.updateOptions({opacity: 0}, () => {
			this.window.minimize();
		});
	}

	public show(): void {
		this.window.restore(()=>{
			this.window.updateOptions({opacity: 1});
			this.window.focus();
		});
	}

    public alignAppWindow(): void {
		WindowManager.instance.window.getBounds((bounds: fin.WindowBounds) => {
			this.window.moveTo(bounds.left!, bounds.top! + 73);
			this.window.getBounds((extBounds: fin.WindowBounds) => {
				this.window.resizeTo(bounds.width!, extBounds.height!, "top-left");
				this.window.joinGroup(WindowManager.instance.window);
			});
		});
	}

    public get getApplication(): fin.OpenFinApplication {
        return this.application;
    }

    public get getWindow(): fin.OpenFinWindow {
        return this.window;
    }
}