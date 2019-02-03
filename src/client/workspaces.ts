/**
 * @module Workspaces
 */
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {channelPromise, tryServiceDispatch} from './connection';
import {WorkspaceAPI} from './internal';
import {CustomData, Workspace, WorkspaceApp} from './types';

export interface WorkspaceGeneratedEvent extends CustomEvent<Workspace> {
    type: 'workspace-generated';
}

export interface WorkspaceRestoredEvent extends CustomEvent<Workspace> {
    type: 'workspace-restored';
}

/**
 * @hidden
 */
export interface EventMap {
    'workspace-restored': WorkspaceRestoredEvent;
    'workspace-generated': WorkspaceGeneratedEvent;
}

/**
 * Event fired whenever a workspace is restored (via {@link restore}).
 *
 * The event will contain the full detail of the ({@link Workspace}).
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('workspace-restored', async (event: WorkspaceRestoredEvent) => {
 *      console.log(`Properties for the restored workspace: ${event.detail}`);
 * });
 * ```
 *
 * @type workspace-restored
 * @event
 */
export async function addEventListener(eventType: 'workspace-restored', listener: (event: WorkspaceRestoredEvent) => void): Promise<void>;

/**
 * Event fired whenever a workspace is {@link generate|generated}.
 *
 * The event will contain the full detail of the {@link Workspace}.
 *
 * ```ts
 * import {addEventListener} from 'openfin-layouts';
 *
 * addEventListener('workspace-generated', async (event: WorkspaceGeneratedEvent) => {
 *     console.log(`Properties for the generated workspace: ${event.detail}`);
 * });
 * ```
 *
 * @type workspace-generated
 * @event
 */
export async function addEventListener(eventType: 'workspace-generated', listener: (event: WorkspaceGeneratedEvent) => void): Promise<void>;

export async function addEventListener<K extends keyof EventMap>(eventType: K, listener: (event: EventMap[K]) => void): Promise<void> {
    if (typeof fin === 'undefined') {
        throw new Error('fin is not defined. The openfin-layouts module is only intended for use in an OpenFin application.');
    }
    // Use native js event system to pass internal events around.
    // Without this we would need to handle multiple registration ourselves.
    window.addEventListener(eventType, listener as EventListener);
}

/**
 * Register a callback that will save the state of the calling application.
 *
 * The callback will be invoked on each call to {@link generate}, and the return value (if anything is returned)
 * will be saved as the workspace's `customData` property.
 */
export async function setGenerateHandler(customDataDecorator: () => CustomData): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register(WorkspaceAPI.GENERATE_HANDLER, customDataDecorator);
}

/**
 * Registers a callback that will restore the application to a previous state.
 *
 * It is up to applications whether this action should "append" or "replace" the current workspace. The service will not
 * close any applications that are currently open and not in the workspace; though applications may do this if they wish.
 */
export async function setRestoreHandler(layoutDecorator: (layoutApp: WorkspaceApp) => WorkspaceApp | false | Promise<WorkspaceApp|false>): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register(WorkspaceAPI.RESTORE_HANDLER, layoutDecorator);
}


/**
 * Generates a JSON object that contains the state of the current desktop.
 *
 * The returned JSON will contain the main application window of every application that is currently open and hasn't
 * explicitly de-registered itself using the layouts service API. Child windows will not be included by default - the
 * returned workspace object will only contain child window data for applications that integrate with the layouts service
 * by registering {@link setGenerateHandler|save} and {@link setRestoreHandler|restore} callbacks.
 *
 * TODO: Document workspace generation process
 */
export async function generate(): Promise<Workspace> {
    return tryServiceDispatch<undefined, Workspace>(WorkspaceAPI.GENERATE_LAYOUT);
}

/**
 * Takes a workspace created by {@link generate} and restores the applications within it.
 *
 * The returned JSON will contain the main application window of every application that is currently open and hasn't
 * explicitly de-registered itself using the layouts service API. Child windows will not be included by default - the
 * returned workspace object will only contain child window data for applications that integrate with the layouts service
 * by registering {@link setGenerateHandler|save} and {@link setRestoreHandler|restore} callbacks.
 *
 * TODO: Document workspace restoration process
 */
export async function restore(payload: Workspace): Promise<Workspace> {
    return tryServiceDispatch<Workspace, Workspace>(WorkspaceAPI.RESTORE_LAYOUT, payload);
}

/**
 * Send this to the service when you have registered all routes after registration.
 *
 * When restoring a workspace, the service will refrain from passing the saved workspace to the application (via the
 * {@link setRestoreHandler} callback) until after the application has used this function to signal that it is ready.
 *
 * Note that by not calling this function, and workspace {@link restore} operation will hang
 * indefinitely.
 */
export async function ready(): Promise<Workspace> {
    return tryServiceDispatch<undefined, Workspace>(WorkspaceAPI.APPLICATION_READY);
}
