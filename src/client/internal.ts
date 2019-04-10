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

import {IdentityRule, RegEx, WindowIdentity} from './main';
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
    if (identity === null || typeof identity !== 'object') {
        throw new Error(ErrorMsgs.IDENTITY_REQUIRED);
    }
    const uuidCheck = typeof identity.uuid === 'string';
    const nameCheck = !identity.name || typeof identity.name === 'string';
    if (!uuidCheck && !nameCheck) {
        throw new Error(ErrorMsgs.INVALID_IDENTITY_BOTH);
    } else if (!uuidCheck) {
        throw new Error(ErrorMsgs.INVALID_IDENTITY_UUID);
    } else if (!nameCheck) {
        throw new Error(ErrorMsgs.INVALID_IDENTITY_NAME);
    }

    return {uuid: identity.uuid, name: identity.name || identity.uuid};
}

/**
 * Like parseIdentity above, but also allows properties to be regex objects.
 */
export function parseIdentityRule(identity: IdentityRule): IdentityRule {
    if (identity === null || typeof identity !== 'object') {
        throw new Error(ErrorMsgs.IDENTITY_REQUIRED);
    }
    const uuidCheck = typeof identity.uuid === 'string' || isRegex(identity.uuid);
    const nameCheck = !identity.name || typeof identity.name === 'string' || isRegex(identity.name);
    if (!uuidCheck && !nameCheck) {
        throw new Error(ErrorMsgs.INVALID_IDENTITYRULE_BOTH);
    } else if (!uuidCheck) {
        throw new Error(ErrorMsgs.INVALID_IDENTITYRULE_UUID);
    } else if (!nameCheck) {
        throw new Error(ErrorMsgs.INVALID_IDENTITYRULE_NAME);
    }

    return {uuid: identity.uuid, name: identity.name || identity.uuid};
}

// tslint:disable-next-line:no-any This is a type guard, and so can take any object.
function isRegex(a: any): a is RegEx {
    return !!a.expression && typeof a.expression === 'string' && (a.flags === undefined || typeof a.flags === 'string') &&
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

export const enum ErrorMsgs {
    IDENTITY_REQUIRED = 'Invalid arguments. Must pass an identity object',
    INVALID_IDENTITY_UUID = 'Invalid Identity provided: uuid must be a string',
    INVALID_IDENTITY_NAME = 'Invalid Identity provided: name must be a string or undefined',
    INVALID_IDENTITY_BOTH = 'Invalid Identity provided: uuid and name must be strings',
    INVALID_IDENTITYRULE_UUID = 'Invalid Identity provided: uuid must be a string or RegEx object',
    INVALID_IDENTITYRULE_NAME = 'Invalid Identity provided: name must be a string, RegEx object, or undefined',
    INVALID_IDENTITYRULE_BOTH = 'Invalid Identity provided: uuid and name must be strings or RegEx objects',
    PROPERTIES_REQUIRED = 'Properties are required'
}
