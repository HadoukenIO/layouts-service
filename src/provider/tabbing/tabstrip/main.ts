import * as layouts from '../../../client/main';
import {WindowIdentity} from '../../../client/main';
import {TabActivatedEvent, TabAddedEvent, TabPropertiesUpdatedEvent, TabRemovedEvent} from '../../../client/tabbing';
import {TabGroupMaximizedEvent, TabGroupRestoredEvent} from '../../../client/tabstrip';

import {TabManager} from './TabManager';
import { WindowDockedEvent, WindowUndockedEvent } from '../../../client/snapanddock';

let tabManager: TabManager;

tabManager = new TabManager();

/**
 * Creates event listeners for events fired from the openfin layouts service.
 */
const createLayoutsEventListeners = () => {
    layouts.tabbing.addEventListener('tab-added', (event: TabAddedEvent) => {
        tabManager.addTab(event.identity, event.properties, event.index);

        document.title = tabManager.getTabs.map(tab => tab.ID.name).join(', ');
    });

    layouts.tabbing.addEventListener('tab-removed', (event: TabRemovedEvent) => {
        tabManager.removeTab(event.identity);

        document.title = tabManager.getTabs.map(tab => tab.ID.name).join(', ');
    });

    layouts.tabbing.addEventListener('tab-activated', (event: TabActivatedEvent) => {
        tabManager.setActiveTab(event.identity);
    });

    layouts.tabbing.addEventListener('tab-properties-updated', (event: TabPropertiesUpdatedEvent) => {
        const tab = tabManager.getTab(event.identity);
        const props = event.properties;

        if (tab) {
            if (props.icon) tab.updateIcon(props.icon);
            if (props.title) tab.updateText(props.title);
        }
    });

    const maximizeElem: HTMLElement = document.getElementById('window-button-maximize')!;

    layouts.tabstrip.addEventListener('tab-group-maximized', (event: TabGroupMaximizedEvent) => {
        tabManager.isMaximized = true;
        maximizeElem.classList.add('restore');
    });

    layouts.tabstrip.addEventListener('tab-group-restored', (event: TabGroupRestoredEvent) => {
        tabManager.isMaximized = false;
        if (maximizeElem.classList.contains('restore')) {
            maximizeElem.classList.remove('restore');
        }
    });

    const undockElem: HTMLElement = document.getElementById('window-button-undock')!;

    layouts.snapAndDock.addEventListener('window-docked', (event: WindowDockedEvent) => {
        undockElem.classList.remove('hidden');
    });

    layouts.snapAndDock.addEventListener('window-undocked', (event: WindowUndockedEvent) => {
        undockElem.classList.add('hidden');
    });
};

/**
 * Creates Event Listeners for window controls (close, maximize, minimize, etc);
 */
const createWindowUIListeners = () => {
    const minimizeElem: HTMLElement = document.getElementById('window-button-minimize')!;
    const maximizeElem: HTMLElement = document.getElementById('window-button-maximize')!;
    const closeElem: HTMLElement = document.getElementById('window-button-exit')!;
    const undockElem: HTMLElement = document.getElementById('window-button-undock')!;

    // Minimize Button
    minimizeElem.onclick = () => {
        layouts.tabbing.minimizeTabGroup();
    };

    // Maximize / Restore button
    maximizeElem.onclick = () => {
        if (!tabManager.isMaximized) {
            layouts.tabbing.maximizeTabGroup();
        } else {
            layouts.tabbing.restoreTabGroup();
        }
    };

    // Close Button
    closeElem.onclick = () => {
        layouts.tabbing.closeTabGroup();
    };

    undockElem.onclick =() => {
        layouts.snapAndDock.undockWindow();
    };
};


createLayoutsEventListeners();
createWindowUIListeners();
