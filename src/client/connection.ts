/**
 * @hidden
 */

/**
 * File contains vars used to establish service connection between client and provider.
 *
 * These are separated out from 'internal.ts' as including these from provider code will cause the provider to connect
 * to itself.
 *
 * These types are a part of the client, but are not required by applications wishing to interact with the service.
 * This file is excluded from the public-facing TypeScript documentation.
 */
import {EventEmitter} from 'events';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {Events as SnapAndDockEvents} from '../client/snapanddock';
import {Events as TabbingEvents} from '../client/tabbing';
import {Events as TabstripEvents} from '../client/tabstrip';
import {Events as WorkspacesEvents} from '../client/workspaces';

import {APITopic, SERVICE_CHANNEL} from './internal';

/**
 * The version of the NPM package.
 *
 * Webpack replaces any instances of this constant with a hard-coded string at build time.
 */
declare const PACKAGE_VERSION: string;

/**
 * Defines all events that are fired by the service
 */
export type Events = TabstripEvents|TabbingEvents|WorkspacesEvents|SnapAndDockEvents;

/**
 * The event emitter to emit events received from the service.  All addEventListeners will tap into this.
 */
export const eventEmitter = new EventEmitter();

/**
 * Promise to the channel object that allows us to connect to the client
 */
export const channelPromise: Promise<ChannelClient> = typeof fin === 'undefined' ?
    Promise.reject('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.') :
    fin.InterApplicationBus.Channel.connect(SERVICE_CHANNEL, {payload: {version: PACKAGE_VERSION}}).then((channel: ChannelClient) => {
        // Register service listeners
        channel.register('WARN', (payload: any) => console.warn(payload));  // tslint:disable-line:no-any
        channel.register('event', (event: Events) => {
            eventEmitter.emit(event.type, event);
        });
        // Any unregistered action will simply return false
        channel.setDefaultAction(() => false);

        return channel;
    });

/**
 * Wrapper around service.dispatch to help with type checking
 */
export async function tryServiceDispatch<T, R>(action: APITopic, payload?: T): Promise<R> {
    const channel: ChannelClient = await channelPromise;
    return channel.dispatch(action, payload) as Promise<R>;
}
