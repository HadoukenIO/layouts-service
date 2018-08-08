import { TabManager } from "./TabManager";

// tslint:disable-next-line:no-any
(window as any).TabManager = new TabManager();
// tslint:disable-next-line:no-any
(window as any).Tab = TabManager.tabAPI;
