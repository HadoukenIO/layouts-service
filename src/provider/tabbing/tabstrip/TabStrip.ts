import { minimizeTabGroup, maximizeTabGroup, restoreTabGroup, closeTabGroup } from '../../../client/main';

import {TabManager} from './TabManager';
import { Identity } from 'hadouken-js-adapter';
import { TabIdentifier } from '../../../client/types';
export {tabStrip} from '../../../client/main';

fin.desktop.main(() => {
    const curWindow = fin.desktop.Window.getCurrent();
    const id = {uuid: curWindow.uuid, name: curWindow.name};
    const tabManager: TabManager = new TabManager();
    (window as Window & {tabManager: TabManager}).tabManager = tabManager;
    const minimizeElem: HTMLElement|null = document.getElementById('window-button-minimize');
    const maximizeElem: HTMLElement|null = document.getElementById('window-button-maximize');
    const closeElem: HTMLElement | null = document.getElementById('window-button-exit');

    minimizeElem!.onclick = () => {
        minimizeTabGroup(tabManager.getTabs[0].ID);
    };

    maximizeElem!.onclick = () => {
        if (!tabManager.isMaximized) {
            maximizeTabGroup(tabManager.getTabs[0].ID);
            tabManager.isMaximized = true;
        } else {
            restoreTabGroup(tabManager.getTabs[0].ID);
            tabManager.isMaximized = false;
        }
    };

    closeElem!.onclick = () => {
        closeTabGroup(tabManager.getTabs[0].ID);
    };
});
