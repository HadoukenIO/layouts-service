import {WorkspaceAPI} from '../client/internal';
import {EventMap as SnapAndDockEventMap} from '../client/snapanddock';
import {EventMap as TabbingEventMap} from '../client/tabbing';
import {EventMap as WorkspacesEventMap} from '../client/workspaces';
import {EventMap as TabstripEventMap} from '../client/tabstrip';

// LegacyAPI to allow for backwards compatibility of older clients (pre 1.0)
export enum LegacyAPI {
    GENERATE_HANDLER = 'savingLayout',
    RESTORE_HANDLER = 'restoreApp',
    GENERATE_LAYOUT = 'generateLayout',
    RESTORE_LAYOUT = 'restoreLayout',
    APPLICATION_READY = 'appReady',
    UNDOCK_WINDOW = 'undockWindow',
    UNDOCK_GROUP = 'undockGroup',
    DEREGISTER = 'deregister',
}

export type WindowMessages = keyof EventMap|WorkspaceAPI.RESTORE_HANDLER|WorkspaceAPI.GENERATE_HANDLER|LegacyAPI.GENERATE_HANDLER|LegacyAPI.RESTORE_HANDLER;

export type EventMap = TabstripEventMap&TabbingEventMap&WorkspacesEventMap&SnapAndDockEventMap;