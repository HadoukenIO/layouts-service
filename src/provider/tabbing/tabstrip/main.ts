import * as layouts from '../../../client/main';
import {WindowIdentity} from '../../../client/main';
import {TabActivatedEvent, TabAddedEvent, TabPropertiesUpdatedEvent, TabRemovedEvent} from '../../../client/tabbing';

import {TabManager} from './TabManager';

let tabManager: TabManager;

tabManager = new TabManager();

/**
 * Creates event listeners for events fired from the openfin layouts service.
 */
const createLayoutsEventListeners = () => {
    layouts.tabbing.addEventListener('tab-added', (event: CustomEvent<TabAddedEvent>) => {
        const tabInfo: TabAddedEvent = event.detail;
        tabManager.addTab(tabInfo.identity, tabInfo.properties, tabInfo.index);

        document.title = tabManager.getTabs.map(tab => tab.ID.name).join(', ');
    });

    layouts.tabbing.addEventListener('tab-removed', (event: CustomEvent<TabRemovedEvent>) => {
        const tabInfo: TabRemovedEvent = event.detail;
        tabManager.removeTab(tabInfo.identity);

        document.title = tabManager.getTabs.map(tab => tab.ID.name).join(', ');
    });

    layouts.tabbing.addEventListener('tab-activated', (event: CustomEvent<TabActivatedEvent>) => {
        const tabInfo: WindowIdentity = event.detail.identity;
        tabManager.setActiveTab(tabInfo);
    });

    layouts.tabbing.addEventListener('tab-properties-updated', (event: CustomEvent<TabPropertiesUpdatedEvent>) => {
        const tab = tabManager.getTab(event.detail.identity);
        const props = event.detail.properties;

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
