import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";
// tslint:disable-next-line:no-any
(window as any).TabManager = new TabManager();
// tslint:disable-next-line:no-any
(window as any).WindowManager = new WindowManager();
