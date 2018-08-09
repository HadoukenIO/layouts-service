import { TabManager } from "./TabManager";
import { Tab } from "./TabItem";

const tabManager: TabManager = new TabManager();


const minimizeElem: HTMLElement | null = document.getElementById('window-button-minimize');
const maximizeElem: HTMLElement | null = document.getElementById('window-button-maximize');
const closeElem: HTMLElement | null = document.getElementById('window-button-exit');

if (TabManager.tabAPI && TabManager.tabAPI.windowActions) {
    minimizeElem!.onclick = TabManager.tabAPI.windowActions.minimize;
    maximizeElem!.onclick = TabManager.tabAPI.windowActions.maximize;
    closeElem!.onclick = TabManager.tabAPI.windowActions.close;
}
