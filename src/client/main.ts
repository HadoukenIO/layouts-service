import { Identity } from 'hadouken-js-adapter';
import { Client as ServiceClient } from 'hadouken-js-adapter/out/types/src/api/services/client';
import * as Mousetrap from 'mousetrap';

import { TabAPI, TabAPIActions } from './APITypes';
import { Layout, LayoutApp, LayoutName, TabProperties, TabWindowOptions, JoinTabGroupPayload, TabGroupEventPayload, DropPosition } from './types';

export { AppApi } from './AppApi';
export { TabbingApi } from './TabbingApi';

const IDENTITY = {
    uuid: 'Layout-Manager',
    name: 'Layout-Manager'
};
const VERSION = '0.0.1';

// tslint:disable-next-line:no-any
declare var fin: any;

if (typeof fin === 'undefined') {
    throw new Error('fin is not defined, This module is only intended for use in an OpenFin application.');
}

const getId = (() => {
    let id: Identity;
    return () => {
        if (id) {
            return id;
        }
        fin.Window.getCurrent();
        const { uuid, name } = fin.desktop.Window.getCurrent();
        id = { uuid, name };
        return id;
    };
})();

const servicePromise: Promise<ServiceClient> = fin.desktop.Service.connect({ ...IDENTITY, payload: VERSION }).then((service: ServiceClient) => {
    // Map undocking keybind
    Mousetrap.bind('mod+shift+u', () => {
        service.dispatch('undockWindow', getId());
        console.log('Window un-docked via keyboard shortcut');
    });

    // Register service listeners
    service.register('WARN', (payload: any) => console.warn(payload));  // tslint:disable-line:no-any
    service.register('join-snap-group', () => {
        window.dispatchEvent(new Event('join-snap-group'));
    });
    service.register('leave-snap-group', () => {
        window.dispatchEvent(new Event('leave-snap-group'));
    });
    service.register('join-tab-group', (payload: JoinTabGroupPayload) => {

        window.dispatchEvent(new CustomEvent<JoinTabGroupPayload>('join-tab-group', { detail: payload }));
    });

    service.register('leave-tab-group', (payload: TabGroupEventPayload) => {
        window.dispatchEvent(new CustomEvent<TabGroupEventPayload>('leave-tab-group'));
    });

    // Any unregistered action will simply return false
    service.setDefaultAction(() => false);

    return service;
});

(window as any).p = servicePromise;

/**
 * Undocks a window from any group it currently belongs to.
 *
 * Has no effect if the window is not currently docked.
 *
 * @param identity The window to undock, defaults to the current window
 */
export async function undockWindow(identity: Identity = getId()): Promise<void> {
    const service: ServiceClient = await servicePromise;
    return service.dispatch('undockWindow', identity);
}

/**
 * Will undock every window that is currently connected to a current window.
 *
 * This will completely disband the entire group, not just the windows directly touching 'identity'.
 *
 * Has no effect if 'identity' isn't currently snapped to any other window.
 *
 * @param identity A window belonging to the group that should be disbanded, defaults to the current window/group
 */
export async function undockGroup(identity: Identity = getId()): Promise<void> {
    const service: ServiceClient = await servicePromise;
    return service.dispatch('undockGroup', identity);
}

/**
 * Allows a window to opt-out of this service. This will disable all layouts-related functionality for the given window.
 *
 * @param identity The window to deregister, defaults to the current window
 */
export async function deregister(identity: Identity = getId()): Promise<void> {
    const service: ServiceClient = await servicePromise;
    return service.dispatch('deregister', identity);
}

/**
 * Registers an event listener for grouping events
 * @param {string} eventType Event to be subscribed to. Valid options are 'join-snap-group' and 'leave-snap-group'
 * @param {() => void} callback Function to be executed on event firing. Takes no arguments and returns void.
 */
//export async function addEventListener(eventType: 'join-tab-group' | 'leave-tab-group', callback: (customEvent: TabEvent) => void): Promise<void>;
export async function addEventListener(
    eventType: 'join-snap-group' | 'leave-snap-group' | 'join-tab-group' | 'leave-tab-group', callback: (customEvent: Event | CustomEvent<TabGroupEventPayload>) => void): Promise<void> {
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(eventType, callback);
}

/**
 * Decide which parts of this you will implement, alter LayoutApp object to reflect this then send it back
 */
export async function onWillSaveAppLayout(layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false | Promise<LayoutApp | false>): Promise<boolean> {
    const service: ServiceClient = await servicePromise;
    return service.register('savingLayout', layoutDecorator);
}

/**
 * Get the layoutApp object, implement, then return implemented LayoutApp object (minus anything not implemented)
 */
export async function onAppRestore(layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false | Promise<LayoutApp | false>): Promise<boolean> {
    const service: ServiceClient = await servicePromise;
    return service.register('restoreApp', layoutDecorator);
}

/**
 * Any time the service saves a layout locally, it also sends to this route (could use own service here)
 */
export async function onLayoutSave(listener: (layout: Layout) => void): Promise<boolean> {
    const service: ServiceClient = await servicePromise;
    return service.register('layoutSaved', listener);
}

/**
 * Service will send out the restored layout with any changes from client connections
 */
export async function onLayoutRestore(listener: (layoutApp: LayoutApp) => void): Promise<boolean> {
    const service: ServiceClient = await servicePromise;
    return service.register('layoutRestored', listener);
}
/**
 * Generate the Layout object for the current Layout
 */
export async function generateLayout(): Promise<Layout> {
    const service: ServiceClient = await servicePromise;
    return service.dispatch('generateLayout');
}

/**
 * Restore a layout from a Layout object
 */
export async function restoreLayout(payload: Layout): Promise<Layout> {
    const service: ServiceClient = await servicePromise;
    return service.dispatch('restoreLayout', payload);
}

/**
 * Send this to the service when you have registered all routes after registration
 */
export async function ready(): Promise<Layout> {
    const service: ServiceClient = await servicePromise;

    return service.dispatch('appReady');
}

/**
 * Returns array of window references for tabs belonging to the tab group of the provided window context.
 *
 * If no Identity is provided as an argument, the current window context will be used.
 *
 * If there is no tab group associated with the window context, will resolve to null.
 */
export async function getTabs(window: Identity = getId()): Promise<Identity[] | null> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.GETTABS, window);
}

/**
 * If a custom tab-strip UI is being used - this sets the URL for the tab-strip.
 * This binding happens on the application level.  An application cannot have different windows using different tabbing UI.
 */
export async function setTabClient(url: string, config: TabWindowOptions): Promise<void> {
    if (!config || isNaN(config.height!)) {
        return Promise.reject('Invalid config height provided');
    }

    try {
        // tslint:disable-next-line:no-unused-expression
        new URL(url);
    } catch (e) {
        return Promise.reject(e);
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.SETTABCLIENT, { url, config });
}

/**
 * Given a set of windows, will create a tab group construct and UI around them.  The bounds and positioning of the first (applicable) window in the set will be
 * used as the seed for the tab UI properties.
 */
export async function createTabGroup(windows: Identity[]): Promise<void> {
    if (!windows || windows.length === 0) {
        return Promise.reject('Invalid window identity array');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.CREATETABGROUP, windows);
}

/**
 * Adds current window context (or window specified in second arg)  to the tab group of the target window (first arg).
 *
 * Will reject with an error if the TabClient of the target and context tab group do not match.
 *
 * The added tab will be brought into focus.
 */
export async function addTab(targetWindow: Identity, windowToAdd: Identity = getId()): Promise<void> {
    if (!targetWindow || !targetWindow.uuid || !targetWindow.name) {
        return Promise.reject('Invalid targetWindow provided');
    }
    if (!windowToAdd || !windowToAdd.name || !windowToAdd.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.ADDTAB, { targetWindow, windowToAdd });
}

/**
 * Removes the specified tab from its tab group.
 * Uses current window context by default
 */
export async function removeTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.REMOVETAB, window);
}

/**
 * Brings the specified tab to the front of the set.
 */
export async function setActiveTab(window: Identity): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.SETACTIVETAB, window);
}

/**
 * Closes the tab for the window context and removes it from the associated tab group.
 */
export async function closeTab(window: Identity): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.CLOSETAB, window);
}

/**
 * Minimizes the tab group for the window context.
 */
export async function minimizeTabGroup(window: Identity): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.MINIMIZETABGROUP, window);
}

/**
 * Maximizes the tab group for the window context.
 */
export async function maximizeTabGroup(window: Identity): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.MAXIMIZETABGROUP, window);
}

/**
 * Closes the tab group for the window context.
 */
export async function closeTabGroup(window: Identity): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.CLOSETABGROUP, window);
}

/**
 * Restores the tab group for the window context to its normal state.
 */
export async function restoreTabGroup(window: Identity): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.RESTORETABGROUP, window);
}

/**
 * Resets the tabs to the order provided.  The length of tabs Identity array must match the current number of tabs, and each current tab must appear in the
 * array exactly once to be valid.  If the input isn’t valid, the call will reject and no change will be made.
 */
export async function reorderTabs(newOrdering: Identity[]): Promise<void> {
    if (!newOrdering || newOrdering.length === 0) {
        return Promise.reject('Invalid new Order array');
    }
    const service: ServiceClient = await servicePromise;

    return service.dispatch(TabAPI.REORDERTABS, newOrdering);
}

export const tabStrip = {
    /**
     * Updates a Tabs Properties on the Tab strip.
     */
    async updateTabProperties(window: Identity, properties: TabProperties): Promise<void> {
        if (!window || !window.name || !window.uuid) {
            return Promise.reject('Invalid window provided');
        }
        const service: ServiceClient = await servicePromise;

        return service.dispatch(TabAPI.UPDATETABPROPERTIES, { window, properties });
    },

    /**
     * Starts the HTML5 Dragging Sequence
     */
    async startDrag() {
        const service: ServiceClient = await servicePromise;

        return service.dispatch(TabAPI.STARTDRAG);
    },

    /**
     * Ends the HTML5 Dragging Sequence.
     */
    async endDrag(event: DragEvent, window: Identity) {
        if (!window || !window.name || !window.uuid) {
            return Promise.reject('Invalid window provided');
        }
        const service: ServiceClient = await servicePromise;

        const dropPoint: DropPosition = {
            screenX: event.screenX,
            screenY: event.screenY
        };

        return service.dispatch(TabAPI.ENDDRAG, { event: dropPoint, window });
    }
};