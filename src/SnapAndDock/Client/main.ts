/*tslint:disable:no-any*/

import * as Mousetrap from 'mousetrap';
import {GroupEventType} from '../Service/main';

import {createClientPromise, exportClientFunction, ServiceClient, ServiceIdentity} from './util';

const VERSION = '0.0.1';

declare var fin: any;
if (typeof fin === 'undefined') {
    throw new Error('fin is not defined, This module is only intended for use in an OpenFin application.');
}

const getId = (() => {
    let id: ServiceIdentity;
    return () => {
        if (id) {
            return id;
        }
        const {uuid, name} = fin.desktop.Window.getCurrent();
        id = {uuid, name};
        return id;
    };
})();

const clientP = createClientPromise({uuid: 'Layouts-Manager', name: 'Layouts-Manager'}, VERSION);

clientP.then(client => {
    // Map undocking keybind
    Mousetrap.bind('mod+shift+u', () => {
        client.dispatch('undock', getId());
        console.log('Window un-docked via keyboard shortcut');
    });

    // Register servive listener for callbacks
    client.register(GroupEventType.JOIN_SNAP_GROUP, () => {
        window.dispatchEvent(new Event(GroupEventType.JOIN_SNAP_GROUP));
    });
    client.register(GroupEventType.LEAVE_SNAP_GROUP, () => {
        window.dispatchEvent(new Event(GroupEventType.LEAVE_SNAP_GROUP));
    });
});

export const undock = exportClientFunction(clientP, (client: ServiceClient) => async (identity: ServiceIdentity = getId()) => {
                          await client.dispatch('undock', identity);
                      }) as (identity?: ServiceIdentity) => Promise<void>;

export const deregister = exportClientFunction(clientP, (client: ServiceClient) => async (identity: ServiceIdentity = getId()) => {
                              await client.dispatch('deregister', identity);
                          }) as (identity?: ServiceIdentity) => Promise<void>;

export const explodeGroup = exportClientFunction(clientP, (client: ServiceClient) => async (identity: ServiceIdentity = getId()) => {
                                await client.dispatch('explode', identity);
                            }) as (identity?: ServiceIdentity) => Promise<void>;
                            
/**
 * Registers an event listener for grouping events
 * @param {GroupEventType} eventType Event to be subscribed to. Valid options are 'join-snap-group' and 'leave-snap-group'
 * @param {() => void} callback Function to be executed on event firing. Takes no arguments and returns void.
 */
export async function addEventListener(eventType: GroupEventType, callback: () => void): Promise<void> {
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(eventType, callback);
}
