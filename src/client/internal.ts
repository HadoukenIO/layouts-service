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
import {WindowIdentity, IdentityRule, RegEx} from './main';
import {ApplicationUIConfig, TabProperties} from './tabbing';


/**
 * Cached window identity (@see getId)
 */
let id: WindowIdentity;

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
export function getId(): WindowIdentity {
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
export function parseIdentity(identity: WindowIdentity|Identity): WindowIdentity {
    if (!identity || !identity.uuid) {
        throw new Error('Invalid Identity provided: A valid Identity contains both a uuid and name');
    }
    const uuidCheck = typeof identity.uuid === 'string';
    const nameCheck = identity.name === undefined || typeof identity.name === 'string';
    if (!uuidCheck && !nameCheck) {
        throw new Error ('Invalid Identity provided: uuid and name must be strings');
    } else if (!uuidCheck) {
        throw new Error ('Invalid Identity provided: uuid must be a string');
    } else if (!nameCheck) {
        throw new Error ('Invalid Identity provided: name must be a string');
    }

    return {uuid: identity.uuid, name: identity.name || identity.uuid};
}

/**
 * Like parseIdentity above, but also allows properties to be regex objects.
 */
export function parseIdentityRule(identity: IdentityRule): IdentityRule {
    if (!identity || !identity.uuid) {
        throw new Error('Invalid Identity provided: A valid Identity contains both a uuid and name');
    }
    const uuidCheck = typeof identity.uuid === 'string' || isRegex(identity.uuid);
    const nameCheck = identity.name === undefined || typeof identity.name === 'string' || isRegex(identity.name);
    if (!uuidCheck && !nameCheck) {
        throw new Error ('Invalid Identity provided: uuid and name must be strings or RegEx objects');
    } else if (!uuidCheck) {
        throw new Error ('Invalid Identity provided: uuid must be a string or RegEx object');
    } else if (!nameCheck) {
        throw new Error ('Invalid Identity provided: name must be a string or RegEx object');
    }
    
    return {uuid: identity.uuid, name: identity.name || identity.uuid};

}

// tslint:disable-next-line:no-any This is a type guard, and so can take any object.
function isRegex(a: any): a is RegEx {
    return !!a.expression && typeof a.expression === 'string' &&
        (a.flags === undefined || typeof a.flags === 'string') &&
        (a.invert === undefined || typeof a.invert === 'boolean');
}


export enum TabAPI {
    CREATETABGROUP = 'CREATETABGROUP',
    SETTABSTRIP = 'SETTABSTRIP',
    GETTABS = 'GETTABS',
    TAB_WINDOW_TO_WINDOW = 'TAB_WINDOW_TO_WINDOW',
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
    config: ApplicationUIConfig;
    id: WindowIdentity;
}

export interface AddTabPayload {
    targetWindow: WindowIdentity;
    windowToAdd: WindowIdentity;
}

export interface UpdateTabPropertiesPayload {
    window: WindowIdentity;
    properties: Partial<TabProperties>;
}

export interface CreateTabGroupPayload {
    windows: WindowIdentity[];
    activeTab?: WindowIdentity;
}