import * as layouts from '../../../client/main';  //The equivalent of 'openfin-layouts' NPM package outside of this project.
import {JoinTabGroupPayload, TabGroupEventPayload, TabIdentifier} from '../../../client/types';

import {TabManager} from './TabManager';

let tabManager: TabManager;

// When Openfin is ready
fin.desktop.main(() => {
    tabManager = new TabManager();
    createLayoutsEventListeners();
    createWindowUIListeners();
});


/**
 * Creates event listeners for events fired from the openfin layouts service.
 */
const createLayoutsEventListeners = () => {
    addEventListener('join-tab-group', (event: CustomEvent<TabGroupEventPayload>|Event) => {
        const customEvent: CustomEvent<JoinTabGroupPayload> = event as CustomEvent<JoinTabGroupPayload>;
        const tabInfo: JoinTabGroupPayload = customEvent.detail;
        tabManager.addTab(tabInfo.tabID, tabInfo.tabProps!, tabInfo.index!);
    });

    addEventListener('leave-tab-group', (event: CustomEvent<TabGroupEventPayload>|Event) => {
        const customEvent: CustomEvent<TabGroupEventPayload> = event as CustomEvent<TabGroupEventPayload>;
        const tabInfo: TabGroupEventPayload = customEvent.detail;
        tabManager.removeTab(tabInfo.tabID);
    });

    addEventListener('tab-activated', (event: CustomEvent<TabGroupEventPayload>|Event) => {
        const customEvent: CustomEvent<TabGroupEventPayload> = event as CustomEvent<TabGroupEventPayload>;
        const tabInfo: TabIdentifier = customEvent.detail.tabID;
        tabManager.setActiveTab(tabInfo);
    });
};

/**
 * Creates Event Listeners for window controls (close, maximize, minimize, etc);
 */
const createWindowUIListeners = () => {
    const minimizeElem: HTMLElement|null = document.getElementById('window-button-minimize');
    const maximizeElem: HTMLElement|null = document.getElementById('window-button-maximize');
    const closeElem: HTMLElement|null = document.getElementById('window-button-exit');

    // Minimize Button
    minimizeElem!.onclick = () => {
        layouts.minimizeTabGroup(tabManager.getTabs[0].ID);
    };

    // Maximize / Restore button
    maximizeElem!.onclick = () => {
        if (!tabManager.isMaximized) {
            layouts.maximizeTabGroup(tabManager.getTabs[0].ID);

            maximizeElem!.classList.add('restore');
            tabManager.isMaximized = true;
        } else {
            layouts.restoreTabGroup(tabManager.getTabs[0].ID);

            tabManager.isMaximized = false;

            if (maximizeElem!.classList.contains('restore')) {
                maximizeElem!.classList.remove('restore');
            }
        }
    };

    // Close Button
    closeElem!.onclick = () => {
        layouts.closeTabGroup(tabManager.getTabs[0].ID);
    };
};
