import {Identity} from 'hadouken-js-adapter';

import {TabAPI} from './APITypes';
import {AddTabPayload, ApplicationUIConfig, CustomData, DropPosition, EndDragPayload, JoinTabGroupPayload, Layout, LayoutApp, LayoutName, SetTabClientPayload, TabGroupEventPayload, TabProperties, UpdateTabPropertiesPayload} from './types';

const IDENTITY = {
    uuid: 'layouts-service',
    name: 'layouts-service'
};

import {version} from './version';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

if (typeof fin === 'undefined') {
    throw new Error('fin is not defined, This module is only intended for use in an OpenFin application.');
}

const getId = (() => {
    let id: Identity;
    return () => {
        if (id) {
            return id;
        }
        const {uuid, name} = fin.Window.me;
        id = {uuid, name};
        return id;
    };
})();

// TODO: Used named channel
const channelPromise: Promise<ChannelClient> = fin.InterApplicationBus.Channel.connect({...IDENTITY, payload: {version}}).then((channel: ChannelClient) => {
    // Register service listeners
    channel.register('WARN', (payload: any) => console.warn(payload));  // tslint:disable-line:no-any
    channel.register('join-snap-group', () => {
        window.dispatchEvent(new Event('join-snap-group'));
    });
    channel.register('leave-snap-group', () => {
        window.dispatchEvent(new Event('leave-snap-group'));
    });
    channel.register('join-tab-group', (payload: JoinTabGroupPayload) => {
        window.dispatchEvent(new CustomEvent<JoinTabGroupPayload>('join-tab-group', {detail: payload}));
    });
    channel.register('leave-tab-group', (payload: TabGroupEventPayload) => {
        window.dispatchEvent(new CustomEvent<TabGroupEventPayload>('leave-tab-group', {detail: payload}));
    });
    channel.register('tab-activated', (payload: TabGroupEventPayload) => {
        window.dispatchEvent(new CustomEvent<TabGroupEventPayload>('tab-activated', {detail: payload}));
    });

    // Any unregistered action will simply return false
    channel.setDefaultAction(() => false);

    return channel;
});

/**
 * Undocks a window from any group it currently belongs to.
 *
 * Has no effect if the window is not currently docked.
 *
 * @param identity The window to undock, defaults to the current window
 */
export async function undockWindow(identity: Identity = getId()): Promise<void> {
    const channel: ChannelClient = await channelPromise;
    return tryServiceDispatch<Identity, void>(channel, 'undockWindow', identity);
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
    const channel: ChannelClient = await channelPromise;
    return tryServiceDispatch<Identity, void>(channel, 'undockGroup', identity);
}

/**
 * Allows a window to opt-out of this service. This will disable all layouts-related functionality for the given window.
 *
 * @param identity The window to deregister, defaults to the current window
 */
export async function deregister(identity: Identity = getId()): Promise<void> {
    const channel: ChannelClient = await channelPromise;
    return tryServiceDispatch<Identity, void>(channel, 'deregister', identity);
}

/**
 * Registers an event listener for grouping events
 * @param {string} eventType Event to be subscribed to. Valid options are 'join-snap-group' and 'leave-snap-group'
 * @param {() => void} callback Function to be executed on event firing. Takes no arguments and returns void.
 */
// export async function addEventListener(eventType: 'join-tab-group' | 'leave-tab-group', callback: (customEvent: TabEvent) => void): Promise<void>;
export async function addEventListener(
    eventType: 'join-snap-group'|'leave-snap-group'|'join-tab-group'|'leave-tab-group'|'tab-activated',
    callback: (customEvent: Event|CustomEvent<TabGroupEventPayload>) => void): Promise<void> {
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(eventType, callback);
}

/**
 * Decide which parts of this you will implement, alter LayoutApp object to reflect this then send it back
 */
export async function onApplicationSave(customDataDecorator: () => CustomData): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register('savingLayout', customDataDecorator);
}

/**
 * Get the layoutApp object, implement, then return implemented LayoutApp object (minus anything not implemented)
 */
export async function onAppRestore(layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false | Promise<LayoutApp|false>): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register('restoreApp', layoutDecorator);
}

/**
 * Any time the service saves a layout locally, it also sends to this route (could use own service here)
 */
export async function onLayoutSave(listener: (layout: Layout) => void): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register('layoutSaved', listener);
}

/**
 * Service will send out the restored layout with any changes from client connections
 */
export async function onLayoutRestore(listener: (layoutApp: LayoutApp) => void): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register('layoutRestored', listener);
}
/**
 * Generate the Layout object for the current Layout
 */
export async function generateLayout(): Promise<Layout> {
    const channel: ChannelClient = await channelPromise;
    return tryServiceDispatch<undefined, Layout>(channel, 'generateLayout');
}

/**
 * Restore a layout from a Layout object
 */
export async function restoreLayout(payload: Layout): Promise<Layout> {
    const channel: ChannelClient = await channelPromise;
    return tryServiceDispatch<Layout, Layout>(channel, 'restoreLayout', payload);
}

/**
 * Send this to the service when you have registered all routes after registration
 */
export async function ready(): Promise<Layout> {
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<undefined, Layout>(channel, 'appReady');
}

/**
 * Returns array of window references for tabs belonging to the tab group of the provided window context.
 *
 * If no Identity is provided as an argument, the current window context will be used.
 *
 * If there is no tab group associated with the window context, will resolve to null.
 */
export async function getTabs(window: Identity = getId()): Promise<Identity[]|null> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, Identity[]|null>(channel, TabAPI.GETTABS, window);
}

/**
 * If a custom tab-strip UI is being used - this sets the URL for the tab-strip.
 * This binding happens on the application level.  An application cannot have different windows using different tabbing UI.
 */
export async function setTabClient(url: string, config: Partial<ApplicationUIConfig&{url: never}>): Promise<void> {
    const resolvedConfig: Partial<ApplicationUIConfig> = {url, ...config};

    if (!config || isNaN(config.height!)) {
        return Promise.reject('Invalid config height provided');
    }

    try {
        // tslint:disable-next-line:no-unused-expression
        new URL(url);
    } catch (e) {
        return Promise.reject(e);
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<SetTabClientPayload, void>(channel, TabAPI.SETTABCLIENT, {id: getId(), config: resolvedConfig});
}

/**
 * Given a set of windows, will create a tab group construct and UI around them.  The bounds and positioning of the first (applicable) window in the set will be
 * used as the seed for the tab UI properties.
 */
export async function createTabGroup(windows: Identity[]): Promise<void> {
    if (!windows || windows.length === 0) {
        return Promise.reject('Invalid window identity array');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity[], void>(channel, TabAPI.CREATETABGROUP, windows);
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
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<AddTabPayload, void>(channel, TabAPI.ADDTAB, {targetWindow, windowToAdd});
}

/**
 * Removes the specified tab from its tab group.
 * Uses current window context by default
 */
export async function removeTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.REMOVETAB, window);
}

/**
 * Brings the specified tab to the front of the set.
 */
export async function setActiveTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.SETACTIVETAB, window);
}

/**
 * Closes the tab for the window context and removes it from the associated tab group.
 */
export async function closeTab(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.CLOSETAB, window);
}

/**
 * Minimizes the tab group for the window context.
 */
export async function minimizeTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.MINIMIZETABGROUP, window);
}

/**
 * Maximizes the tab group for the window context.
 */
export async function maximizeTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.MAXIMIZETABGROUP, window);
}

/**
 * Closes the tab group for the window context.
 */
export async function closeTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.CLOSETABGROUP, window);
}

/**
 * Restores the tab group for the window context to its normal state.
 */
export async function restoreTabGroup(window: Identity = getId()): Promise<void> {
    if (!window || !window.name || !window.uuid) {
        return Promise.reject('Invalid window provided');
    }
    const channel: ChannelClient = await channelPromise;

    return tryServiceDispatch<Identity, void>(channel, TabAPI.RESTORETABGROUP, window);
}


export const tabStrip = {
    /**
     * Updates a Tabs Properties on the Tab strip.
     */
    async updateTabProperties(window: Identity, properties: Partial<TabProperties>): Promise<void> {
        if (!window || !window.name || !window.uuid) {
            return Promise.reject('Invalid window provided');
        }
        const channel: ChannelClient = await channelPromise;

        return tryServiceDispatch<UpdateTabPropertiesPayload, void>(channel, TabAPI.UPDATETABPROPERTIES, {window, properties});
    },

    /**
     * Starts the HTML5 Dragging Sequence
     */
    async startDrag() {
        const channel: ChannelClient = await channelPromise;

        return tryServiceDispatch<undefined, void>(channel, TabAPI.STARTDRAG);
    },

    /**
     * Ends the HTML5 Dragging Sequence.
     */
    async endDrag(event: DragEvent, window: Identity) {
        if (!window || !window.name || !window.uuid) {
            return Promise.reject('Invalid window provided');
        }
        const channel: ChannelClient = await channelPromise;

        const dropPoint: DropPosition = {screenX: event.screenX, screenY: event.screenY};

        return tryServiceDispatch<EndDragPayload, void>(channel, TabAPI.ENDDRAG, {event: dropPoint, window});
    },

    /**
     * Resets the tabs to the order provided.  The length of tabs Identity array must match the current number of tabs, and each current tab must appear in the
     * array exactly once to be valid.  If the input isn’t valid, the call will reject and no change will be made.
     */
    async reorderTabs(newOrdering: Identity[]): Promise<void> {
        if (!newOrdering || newOrdering.length === 0) {
            return Promise.reject('Invalid new Order array');
        }
        const channel: ChannelClient = await channelPromise;

        return tryServiceDispatch<Identity[], void>(channel, TabAPI.REORDERTABS, newOrdering);
    }
};

/**
 * Wrapper around service.dispatch to help with type checking
 */
const tryServiceDispatch = async<T, R>(channel: ChannelClient, action: string, payload?: T): Promise<R> => {
    return channel.dispatch(action, payload) as Promise<R>;
};