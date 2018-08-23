import * as Mousetrap from 'mousetrap';

import {Client as ServiceClient} from 'hadouken-js-adapter/out/types/src/api/services/client';
import {Layout, LayoutApp, LayoutName} from './types';
import {Identity} from 'hadouken-js-adapter';

export {AppApi} from "./AppApi";
export {TabbingApi} from "./TabbingApi";

const IDENTITY = {uuid: 'Layout-Manager', name: 'Layout-Manager'};
const VERSION = '0.0.1';

//tslint:disable-next-line:no-any
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
        const {uuid, name} = fin.desktop.Window.getCurrent();
        id = {uuid, name};
        return id;
    };
})();

const servicePromise: Promise<ServiceClient> = fin.desktop.Service.connect({...IDENTITY, payload: VERSION}).then((service: ServiceClient) => {
    // Map undocking keybind
    Mousetrap.bind('mod+shift+u', () => {
        service.dispatch('undockWindow', getId());
        console.log('Window un-docked via keyboard shortcut');
    });

    // Register service listeners
    service.register('WARN', (payload: any) => console.warn(payload));  //tslint:disable-line:no-any
    service.register('join-snap-group', () => {
        window.dispatchEvent(new Event('join-snap-group'));
    });
    service.register('leave-snap-group', () => {
        window.dispatchEvent(new Event('leave-snap-group'));
    });
    
    // Any unregistered action will simply return false
    service.setDefaultAction(() => false);

    return service;
});

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
export async function addEventListener(eventType: 'join-snap-group'|'leave-snap-group', callback: () => void): Promise<void> {
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
    console.log("in generateLayout");
    return service.dispatch('generateLayout');
}

/**
 * Restore a layout from a Layout object
 */
export async function restoreLayout(payload: Layout): Promise<Layout> {
    const service: ServiceClient = await servicePromise;
    console.log("in client code", payload);
    return service.dispatch('restoreLayout', payload);
}

/**
 * Send this to the service when you have registered all routes after registration
 */
export async function ready(): Promise<Layout> {
    const service: ServiceClient = await servicePromise;

    return service.dispatch('appReady');
}
