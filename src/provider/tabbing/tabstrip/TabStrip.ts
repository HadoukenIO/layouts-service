import { TabManager } from "./TabManager";

// tslint:disable-next-line:no-any
declare var fin: any;

fin.desktop.main(() => {
	const tabManager: TabManager = new TabManager();
	(window as Window & { tabManager: TabManager }).tabManager = tabManager;

	const minimizeElem: HTMLElement | null = document.getElementById("window-button-minimize");
	const maximizeElem: HTMLElement | null = document.getElementById("window-button-maximize");
	const closeElem: HTMLElement | null = document.getElementById("window-button-exit");

	if (TabManager.tabAPI && TabManager.tabAPI.windowActions) {
		minimizeElem!.onclick = TabManager.tabAPI.windowActions.minimize;
		maximizeElem!.onclick = TabManager.tabAPI.windowActions.maximize;
		closeElem!.onclick = TabManager.tabAPI.windowActions.close;
	}
});
