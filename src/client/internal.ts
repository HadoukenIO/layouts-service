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
import {WindowIdentity} from './main';
import {ApplicationUIConfig, TabProperties} from './tabbing';


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
        id = parseIdentity(fin.Window.me);
    }

    return id;
}

/**
 * Returns an Identity from a complete window object.  Useful to remove only the Identity instead of sending through a whole window context.
 *
 * Assumed that the supplied object has uuid & name.
 */
export function parseIdentity(identity: WindowIdentity|Identity) {
    if (!identity || !identity.uuid) {
        throw new Error('Invalid Identity provided.  A valid Identity contains both a uuid and name');
    }

    return {uuid: identity.uuid, name: identity.name || identity.uuid};
}


export enum TabAPI {
    CREATETABGROUP = 'CREATETABGROUP',
    SETTABSTRIP = 'SETTABSTRIP',
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

export enum WorkspaceAPI {
    RESTORE_HANDLER = 'SET-RESTORE-HANDLER',
    GENERATE_HANDLER = 'SET-GENERATE-HANDLER',
    GENERATE_LAYOUT = 'GENERATE-WORKSPACE',
    RESTORE_LAYOUT = 'RESTORE-WORKSPACE',
    APPLICATION_READY = 'WORKSPACE-APP-READY'
}

export enum SnapAndDockAPI {
    UNDOCK_WINDOW = 'UNDOCK-WINDOW',
    UNDOCK_GROUP = 'UNDOCK-GROUP'
}

export enum RegisterAPI {
    REGISTER = 'REGISTER',
    DEREGISTER = 'DEREGISTER'
}

export type APITopic = TabAPI|WorkspaceAPI|SnapAndDockAPI|RegisterAPI;


export interface SetTabstripPayload {
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

export interface CreateTabGroupPayload {
    windows: Identity[];
    activeTab?: Identity;
}