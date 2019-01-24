/**
 * @module Workspaces
 */
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {channelPromise, tryServiceDispatch} from './connection';
import {CustomData, Layout, LayoutApp} from './types';
import { WorkspaceAPI } from './internal';

/**
 * Register a callback that will save the state of the calling application.
 *
 * The callback will be invoked on each call to {@link generateLayout}, and the return value (if anything is returned)
 * will be saved as the layout's `customData` property.
 */
export async function setSaveHandler(customDataDecorator: () => CustomData): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register(WorkspaceAPI.SAVE_HANDLER, customDataDecorator);
}

/**
 * Registers a callback that will restore the application to a previous state.
 *
 * It is up to applications whether this action should "append" or "replace" the current layout. The service will not
 * close any applications that are currently open and not in the layout; though applications may do this if they wish.
 */
export async function setRestoreHandler(layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false | Promise<LayoutApp|false>): Promise<boolean> {
    const channel: ChannelClient = await channelPromise;
    return channel.register(WorkspaceAPI.RESTORE_HANDLER, layoutDecorator);
}


/**
 * Generates a JSON object that contains the state of the current desktop.
 *
 * The returned JSON will contain the main application window of every application that is currently open and hasn't
 * explicitly de-registered itself using the layouts service API. Child windows will not be included by default - the
 * returned layout object will only contain child window data for applications that integrate with the layouts service
 * by registering {@link onApplicationSave|save} and {@link onAppRestore|restore} callbacks.
 *
 * TODO: Document workspace generation process
 */
export async function generateLayout(): Promise<Layout> {
    return tryServiceDispatch<undefined, Layout>(WorkspaceAPI.GENERATE_LAYOUT);
}

/**
 * Takes a layout created by {@link generateLayout} and restores the applications within it.
 *
 * The returned JSON will contain the main application window of every application that is currently open and hasn't
 * explicitly de-registered itself using the layouts service API. Child windows will not be included by default - the
 * returned layout object will only contain child window data for applications that integrate with the layouts service
 * by registering {@link onApplicationSave|save} and {@link onAppRestore|restore} callbacks.
 *
 * TODO: Document workspace restoration process
 */
export async function restoreLayout(payload: Layout): Promise<Layout> {
    return tryServiceDispatch<Layout, Layout>(WorkspaceAPI.RESTORE_LAYOUT, payload);
}

/**
 * Send this to the service when you have registered all routes after registration.
 *
 * When restoring a layout, the service will refrain from passing the saved layout to the application (via the
 * {@link onAppRestore} callback) until after the application has used this function to signal that it is ready.
 *
 * Note that by not calling this function, and workspace {@link restoreLayout|restore} operation will hang
 * indefinitely.
 */
export async function ready(): Promise<Layout> {
    return tryServiceDispatch<undefined, Layout>(WorkspaceAPI.APPLICATION_READY);
}
