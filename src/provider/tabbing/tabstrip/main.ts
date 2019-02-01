import * as layouts from '../../../client/main';
import {JoinTabGroupPayload, TabGroupEventPayload, TabPropertiesUpdatedPayload} from '../../../client/types';
import {WindowIdentity} from '../../../client/types';

import {TabManager} from './TabManager';

let tabManager: TabManager;

tabManager = new TabManager();


/**
 * Creates event listeners for events fired from the openfin layouts service.
 */
const createLayoutsEventListeners = () => {
    layouts.addEventListener('join-tab-group', (event: CustomEvent<JoinTabGroupPayload>) => {
        const tabInfo: JoinTabGroupPayload = event.detail;
        tabManager.addTab(tabInfo.identity, tabInfo.properties!, tabInfo.index!);

        document.title = tabManager.getTabs.map(tab => tab.ID.name).join(', ');
    });

    layouts.addEventListener('leave-tab-group', (event: CustomEvent<TabGroupEventPayload>) => {
        const tabInfo: TabGroupEventPayload = event.detail;
        tabManager.removeTab(tabInfo.identity);

        document.title = tabManager.getTabs.map(tab => tab.ID.name).join(', ');
    });

    layouts.addEventListener('tab-activated', (event: CustomEvent<TabGroupEventPayload>) => {
        const tabInfo: WindowIdentity = event.detail.identity;
        tabManager.setActiveTab(tabInfo);
    });

    layouts.addEventListener('tab-properties-updated', (event: CustomEvent<TabPropertiesUpdatedPayload>|Event) => {
        const customEvent: CustomEvent<TabPropertiesUpdatedPayload> = event as CustomEvent<TabPropertiesUpdatedPayload>;

        const tab = tabManager.getTab(customEvent.detail.identity);
        const props = customEvent.detail.properties;

        if (tab) {
            if (props.icon) tab.updateIcon(props.icon);
            if (props.title) tab.updateText(props.title);
        }
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
        layouts.tabbing.minimizeTabGroup(tabManager.getTabs[0].ID);
    };

    // Maximize / Restore button
    maximizeElem!.onclick = () => {
        if (!tabManager.isMaximized) {
            layouts.tabbing.maximizeTabGroup(tabManager.getTabs[0].ID);

            maximizeElem!.classList.add('restore');
            tabManager.isMaximized = true;
        } else {
            layouts.tabbing.restoreTabGroup(tabManager.getTabs[0].ID);

            tabManager.isMaximized = false;

            if (maximizeElem!.classList.contains('restore')) {
                maximizeElem!.classList.remove('restore');
            }
        }
    };

    // Close Button
    closeElem!.onclick = () => {
        layouts.tabbing.closeTabGroup(tabManager.getTabs[0].ID);
    };
};


createLayoutsEventListeners();
createWindowUIListeners();
