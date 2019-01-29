/**
 * @hidden
 */

/**
 * File contains types used to communicate between client and provider.
 *
 * These types are a part of the client, but are not required by applications wishing to interact with the service.
 * This file is excluded from the public-facing TypeScript documentation.
 */
import {Identity} from 'hadouken-js-adapter';

import {ApplicationUIConfig, TabProperties, WindowIdentity} from './types';

/**
 * Cached window identity (@see getId)
 */
let id: Identity;

/**
 * The identity of the main application window of the service provider
 */
export const SERVICE_IDENTITY: WindowIdentity = {
    uuid: 'layouts-service',
    name: 'layouts-service'
};

/**
 * Name of the IAB channel use to communicate between client and provider
 */
export const SERVICE_CHANNEL = 'of-layouts-service-v1';


/**
 * Returns the identity of the window that is calling these functions
 */
export function getId(): Identity {
    if (!id) {
        id = {...fin.Window.me};
    }

    return id;
}

export enum TabAPI {
    CREATETABGROUP = 'CREATETABGROUP',
    SETTABCLIENT = 'SETTABCLIENT',
    GETTABS = 'GETTABS',
    ADDTAB = 'ADDTAB',
    REMOVETAB = 'REMOVETAB',
    SETACTIVETAB = 'SETACTIVETAB',
    MINIMIZETABGROUP = 'MINIMIZETABGROUP',
    MAXIMIZETABGROUP = 'MAXIMIZETABGROUP',
    CLOSETABGROUP = 'CLOSETABGROUP',
    RESTORETABGROUP = 'RESTORETABGROUP',
    REORDERTABS = 'REORDERTABS',
    STARTDRAG = 'STARTDRAG',
    ENDDRAG = 'ENDDRAG',
    UPDATETABPROPERTIES = 'UPDATETABPROPERTIES',
    CLOSETAB = 'CLOSETAB'
}


export enum TabAPIWindowActions {
    MAXIMIZE = 'MAXIMIZEWINDOW',
    MINIMIZE = 'MINIMIZEWINDOW',
    RESTORE = 'RESTOREWINDOW',
    CLOSE = 'CLOSEWINDOW',
    TOGGLEMAXIMIZE = 'TOGGLEMAXIMIZE'
}


/**
 * Each action coming into the will have an action attached
 */
export interface TabAPIMessage {
    action: string;
}

/**
 * When the tab API makes a call to the service a uuid and name should be provided
 */
export interface TabAPIInteractionMessage extends TabAPIMessage {
    uuid: string;
    name: string;
    properties?: TabProperties;
}

export interface TabAPIDragMessage extends TabAPIMessage {
    event: ApplicationUIConfig|null;
    uuid: string;
    name: string;
}

export interface TabAPIReorderMessage extends TabAPIMessage {
    tabOrder: WindowIdentity[];
}

export interface SetTabClientPayload {
    config: Partial<ApplicationUIConfig>;
    id: Identity;
}

export interface AddTabPayload {
    targetWindow: Identity;
    windowToAdd: Identity;
}

export interface UpdateTabPropertiesPayload {
    window: Identity;
    properties: Partial<TabProperties>;
}

export interface DropPosition {
    screenX: number;
    screenY: number;
}

export interface StartDragPayload {
    window: Identity;
}

export interface EndDragPayload {
    event: DropPosition;
    window: Identity;
}
