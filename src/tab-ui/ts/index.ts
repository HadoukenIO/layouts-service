
import { TabWindow } from "./TabWindow";
import { WindowManager } from "./WindowManager";

// tslint:disable-next-line:no-any
(window as any).WindowManager = new WindowManager();
// tslint:disable-next-line:no-unused-expression
new TabWindow();