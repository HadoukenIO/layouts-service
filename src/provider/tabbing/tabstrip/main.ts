import {Fin} from 'hadouken-js-adapter';
import {PointTopLeft} from 'hadouken-js-adapter/out/types/src/api/system/point';
import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import * as layouts from '../../../client/main';
import {WindowIdentity} from '../../../client/main';
import {TabActivatedEvent, TabAddedEvent, TabPropertiesUpdatedEvent, TabRemovedEvent} from '../../../client/tabbing';
import {TabGroupMaximizedEvent, TabGroupRestoredEvent} from '../../../client/tabstrip';

import {TabManager} from './TabManager';

let tabManager: TabManager;

tabManager = new TabManager();

let dragAnimationFrameRequestID: number|undefined;

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
};

/**
 * Creates Event Listeners for window controls (close, maximize, minimize, etc);
 */
const createWindowUIListeners = () => {
    const ofWindow = fin.Window.getCurrentSync();

    const minimizeElem: HTMLElement = document.getElementById('window-button-minimize')!;
    const maximizeElem: HTMLElement = document.getElementById('window-button-maximize')!;
    const closeElem: HTMLElement = document.getElementById('window-button-exit')!;

    const dragElem: HTMLElement = document.getElementById('drag-region')!;

    // Minimize Button
    minimizeElem.onclick = () => {
        layouts.tabbing.minimizeTabGroup(tabManager.getTabs[0].ID);
    };

    // Maximize/Restore button/area
    const toggleHandler = () => {
        if (!tabManager.isMaximized) {
            layouts.tabbing.maximizeTabGroup(tabManager.getTabs[0].ID);
        } else {
            layouts.tabbing.restoreTabGroup(tabManager.getTabs[0].ID);
        }

        clearInterval(dragAnimationFrameRequestID);
    };
    maximizeElem.onclick = toggleHandler;
    dragElem.ondblclick = toggleHandler;

    // Close Button
    closeElem.onclick = () => {
        layouts.tabbing.closeTabGroup(tabManager.getTabs[0].ID);
    };

    // Draggable area
    dragElem.onmousedown = async () => {
        if (!tabManager.isMaximized) {
            window.getSelection().empty();

            const [startMousePosition, startBounds] = await Promise.all<PointTopLeft, Bounds>([fin.System.getMousePosition(), ofWindow.getBounds()]);

            if (dragAnimationFrameRequestID !== undefined) {
                cancelAnimationFrame(dragAnimationFrameRequestID);
            }

            dragAnimationFrameRequestID = requestAnimationFrame(async () => {
                await updateBoundsFromDragging(startMousePosition, startBounds, ofWindow);
            });
        }
    };

    window.onmouseup = () => {
        if (dragAnimationFrameRequestID) {
            cancelAnimationFrame(dragAnimationFrameRequestID);
            dragAnimationFrameRequestID = undefined;
        }
    };
};

const updateBoundsFromDragging = async (startMousePosition: PointTopLeft, startBounds: Bounds, ofWindow: _Window) => {
    const mousePosition = await fin.System.getMousePosition();
    const xDelta = mousePosition.left - startMousePosition.left;
    const yDelta = mousePosition.top - startMousePosition.top;

    const left = startBounds.left + xDelta;
    const top = startBounds.top + yDelta;
    const width = startBounds.width;
    const height = startBounds.height;

    const bounds = {left, top, width, height};

    await ofWindow.setBounds(bounds);
    if (dragAnimationFrameRequestID !== undefined) {
        dragAnimationFrameRequestID = requestAnimationFrame(async () => {
            await updateBoundsFromDragging(startMousePosition, startBounds, ofWindow);
        });
    }
};

createLayoutsEventListeners();
createWindowUIListeners();
