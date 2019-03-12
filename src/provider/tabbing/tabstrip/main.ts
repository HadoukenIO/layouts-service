import * as layouts from '../../../client/main';
import {WindowIdentity} from '../../../client/main';
import {WindowDockedEvent, WindowUndockedEvent} from '../../../client/snapanddock';
import {TabActivatedEvent, TabAddedEvent, TabPropertiesUpdatedEvent, TabRemovedEvent} from '../../../client/tabbing';
import {TabGroupMaximizedEvent, TabGroupRestoredEvent} from '../../../client/tabstrip';

import {TabManager} from './TabManager';

let tabManager: TabManager;

tabManager = new TabManager();

interface TabstripElements {
    minimizeElem: HTMLElement;
    maximizeElem: HTMLElement;
    closeElem: HTMLElement;
    undockElem: HTMLElement;
}

const aquireTabstripElements = () => {
    const minimizeElem: HTMLElement = document.getElementById('window-button-minimize')!;
    const maximizeElem: HTMLElement = document.getElementById('window-button-maximize')!;
    const closeElem: HTMLElement = document.getElementById('window-button-exit')!;
    const undockElem: HTMLElement = document.getElementById('window-button-undock')!;

    return {minimizeElem, maximizeElem, closeElem, undockElem};
};

/**
 * Creates event listeners for events fired from the openfin layouts service.
 */
const createLayoutsEventListeners = (tabstripElements: TabstripElements) => {
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

    const maximizeElem = tabstripElements.maximizeElem;

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

    const undockElem = tabstripElements.undockElem;

    layouts.snapAndDock.addEventListener('window-docked', (event: WindowDockedEvent) => {
        if (maximizeElem.classList.contains('hidden')) {
            undockElem.classList.remove('hidden');
        }
    });

    layouts.snapAndDock.addEventListener('window-undocked', (event: WindowUndockedEvent) => {
        undockElem.classList.add('hidden');
    });
};

/**
 * Creates Event Listeners for window controls (close, maximize, minimize, etc);
 */
const createWindowUIListeners = (tabstripElements: TabstripElements) => {
    // Minimize Button
    tabstripElements.minimizeElem.onclick = () => {
        layouts.tabbing.minimizeTabGroup();
    };

    // Maximize / Restore button
    tabstripElements.maximizeElem.onclick = () => {
        if (!tabManager.isMaximized) {
            layouts.tabbing.maximizeTabGroup();
        } else {
            layouts.tabbing.restoreTabGroup();
        }
    };

    // Close Button
    tabstripElements.closeElem.onclick = () => {
        layouts.tabbing.closeTabGroup();
    };

    tabstripElements.undockElem.onclick = () => {
        layouts.snapAndDock.undockWindow();
    };
};

const tabstripElements = aquireTabstripElements();

createLayoutsEventListeners(tabstripElements);
createWindowUIListeners(tabstripElements);
