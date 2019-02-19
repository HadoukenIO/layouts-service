import {WorkspaceAPI} from '../client/internal';
import {EventMap as SnapAndDockEventMap} from '../client/snapanddock';
import {EventMap as TabbingEventMap} from '../client/tabbing';
import {EventMap as TabstripEventMap} from '../client/tabstrip';
import {EventMap as WorkspacesEventMap, WorkspaceApp} from '../client/workspaces';

/**
 * Sets the channel topic used to send events to the windows.  All windows which include the client will be listening to this topic name.
 */
export const EVENT_CHANNEL_TOPIC = 'event';

export type MessageMap = {
    [WorkspaceAPI.RESTORE_HANDLER]: WorkspaceApp,
    [WorkspaceAPI.GENERATE_HANDLER]: WorkspaceApp,
    [EVENT_CHANNEL_TOPIC]: EventMap
};

export type EventMap = TabstripEventMap|TabbingEventMap|WorkspacesEventMap|SnapAndDockEventMap;
