// tslint:disable-next-line:no-implicit-dependencies
import * as layouts from "openfin-layouts";
import { TabManager } from "./TabManager";
import { TabWindow } from "./TabWindow";
import { WindowManager } from "./WindowManager";

window.top.addEventListener("DOMContentLoaded", () => {
	layouts.deregister();
	// tslint:disable-next-line:no-any
	(window as any).TabManager = new TabManager();
	// tslint:disable-next-line:no-any
	(window as any).WindowManager = new WindowManager();
	// tslint:disable-next-line:no-any
	(window as any).TabWindow = new TabWindow();
});
