/**
 * @module Workspaces
 */
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {channelPromise, tryServiceDispatch} from './connection';
import {WorkspaceAPI} from './internal';
import {CustomData, Workspace, WorkspaceApp} from './types';

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
 * by registering {@link setSaveHandler|save} and {@link setRestoreHandler|restore} callbacks.
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
 * by registering {@link setSaveHandler|save} and {@link setRestoreHandler|restore} callbacks.
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
