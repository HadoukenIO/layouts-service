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
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {APITopics, SERVICE_CHANNEL} from './internal';
import {JoinTabGroupPayload, TabGroupEventPayload, TabPropertiesUpdatedPayload, Workspace} from './types';


/**
 * The version of the NPM package.
 *
 * Webpack replaces any instances of this constant with a hard-coded string at build time.
 */
declare const PACKAGE_VERSION: string;

/**
 * Promise to the channel object that allows us to connect to the client
 */
export const channelPromise: Promise<ChannelClient> = typeof fin === 'undefined' ?
    Promise.reject('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.') :
    fin.InterApplicationBus.Channel.connect(SERVICE_CHANNEL, {payload: {version: PACKAGE_VERSION}}).then((channel: ChannelClient) => {
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
        channel.register('tab-properties-updated', (payload: TabPropertiesUpdatedPayload) => {
            window.dispatchEvent(new CustomEvent<TabPropertiesUpdatedPayload>('tab-properties-updated', {detail: payload}));
        });

        channel.register('workspace-saved', (payload: Workspace) => {
            window.dispatchEvent(new CustomEvent<Workspace>('workspace-saved', {detail: payload}));
        });

        channel.register('workspace-restored', (payload: Workspace) => {
            window.dispatchEvent(new CustomEvent<Workspace>('workspace-restored', {detail: payload}));
        });
        // Any unregistered action will simply return false
        channel.setDefaultAction(() => false);

        return channel;
    });

/**
 * Wrapper around service.dispatch to help with type checking
 */
export async function tryServiceDispatch<T, R>(action: APITopics, payload?: T): Promise<R> {
    const channel: ChannelClient = await channelPromise;
    return channel.dispatch(action, payload) as Promise<R>;
}
