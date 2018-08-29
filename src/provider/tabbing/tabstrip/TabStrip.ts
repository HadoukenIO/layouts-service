import { TabManager } from './TabManager';
import * as Layouts from '../../../client/main';
export { tabStrip } from '../../../client/main';

fin.desktop.main(() => {
    const curWindow = fin.desktop.Window.getCurrent();
    const id = { uuid: curWindow.uuid, name: curWindow.name };
    const tabManager: TabManager = new TabManager();
    (window as Window & { tabManager: TabManager }).tabManager = tabManager;
    const minimizeElem: HTMLElement|null = document.getElementById('window-button-minimize');
    const maximizeElem: HTMLElement|null = document.getElementById('window-button-maximize');
    const closeElem: HTMLElement|null = document.getElementById('window-button-exit');

    

    if (TabManager.tabAPI && TabManager.tabAPI.windowActions) {
        minimizeElem!.onclick = () => {
            Layouts.minimizeTabGroup(id);
        };

        maximizeElem!.onclick = () => {
            if (!tabManager.isMaximized) {
                Layouts.maximizeTabGroup(id);
                tabManager.isMaximized = true;
            } else {
                Layouts.restoreTabGroup(id);
                tabManager.isMaximized = false;
            }
            
        };

        closeElem!.onclick = () => {
            Layouts.closeTabGroup(id);
        };
    }

});
