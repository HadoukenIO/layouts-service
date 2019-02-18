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

import {APITopic, SERVICE_CHANNEL} from './internal';
import {TabAddedEvent, TabPropertiesUpdatedEvent, TabRemovedEvent, TabActivatedEvent} from './tabbing';
import {Workspace, WorkspaceGeneratedEvent, WorkspaceRestoredEvent} from './workspaces';


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
        channel.register('window-docked', () => {
            window.dispatchEvent(new Event('window-docked'));
        });
        channel.register('window-undocked', () => {
            window.dispatchEvent(new Event('window-undocked'));
        });
        channel.register('tab-added', (payload: TabAddedEvent) => {
            window.dispatchEvent(new CustomEvent<TabAddedEvent>('tab-added', {detail: payload}));
        });
        channel.register('tab-removed', (payload: TabRemovedEvent) => {
            window.dispatchEvent(new CustomEvent<TabRemovedEvent>('tab-removed', {detail: payload}));
        });
        channel.register('tab-activated', (payload: TabActivatedEvent) => {
            window.dispatchEvent(new CustomEvent<TabActivatedEvent>('tab-activated', {detail: payload}));
        });
        channel.register('tab-properties-updated', (payload: TabPropertiesUpdatedEvent) => {
            window.dispatchEvent(new CustomEvent<TabPropertiesUpdatedEvent>('tab-properties-updated', {detail: payload}));
        });

        channel.register('workspace-generated', (payload: Workspace) => {
            window.dispatchEvent(new CustomEvent<WorkspaceGeneratedEvent>('workspace-generated', {detail: {workspace: payload}}));
        });

        channel.register('workspace-restored', (payload: Workspace) => {
            window.dispatchEvent(new CustomEvent<WorkspaceRestoredEvent>('workspace-restored', {detail: {workspace: payload}}));
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
