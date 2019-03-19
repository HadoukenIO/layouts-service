import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {Workspace, WorkspaceApp, WorkspaceWindow} from '../../client/workspaces';
import {loader} from '../main';

import {SCHEMA_MAJOR_VERSION} from './create';

export interface SemVer {
    major: number;
    minor: number;
    patch: number;
}

/**
 * Partial re-declaration of 'ApplicationInfo'.
 *
 * `manifest` lacks type information, so defining the subset of manifest fields that are used by the service here.
 */
interface AppInfo extends ApplicationInfo {
    manifest: {startup_app: {uuid: string;};};
}

export const linkAppsToOriginalParentUuid = (payload: Workspace) => {
    payload.apps.forEach((app: WorkspaceApp) => {
        if (app.parentUuid) {
            loader.overrideAppParent(app.uuid, app.parentUuid);
        }
    });
};

export const validatePayload = (payload: Workspace): void => {
    // Guards against invalid workspace objects (since we are receiving them over the service bus, this is in theory possible)
    // These allow us to return sensible error messages back to the consumer
    if (!payload) {
        throw new Error('Received invalid workspace object');
    }
    if (!payload.schemaVersion) {
        throw new Error('Received invalid workspace object: payload.schemaVersion is undefined');
    } else {
        let providedSchemaVersion: SemVer;
        try {
            providedSchemaVersion = parseVersionString(payload.schemaVersion);
        } catch (e) {
            throw new Error('Received invalid workspace object: schemaVersion string does not comply with semver format ("a.b.c")');
        }

        // Only checks major version. Service is assumed to work with minor and patch version changes.
        if (providedSchemaVersion.major > SCHEMA_MAJOR_VERSION) {
            throw new Error(`Received incompatible worksapce object. Provided schemaVersion is ${
                payload.schemaVersion}, but this version of the service only supports versions up to ${SCHEMA_MAJOR_VERSION}.x.x`);
        }
    }

    if (!payload.apps) {
        throw new Error('Received invalid workspace object: payload.apps is undefined');
    }
    if (!payload.monitorInfo) {
        throw new Error('Received invalid workspace object: payload.monitorInfo is undefined');
    }
};

export const consolidateAppResponses = (apps: WorkspaceApp[], startupResponses: WorkspaceApp[]) => {
    return apps.map(app => {
        const appResponse = startupResponses.find(appRes => appRes.uuid === app.uuid);
        return appResponse ? appResponse : app;
    });
};

// Check to see if we have sufficient information to restore an app programmatically.
export const canRestoreProgrammatically = (app: ApplicationInfo|WorkspaceApp) => {
    const initialOptions = app.initialOptions as fin.ApplicationOptions;

    if (app && initialOptions && initialOptions.uuid) {
        if (initialOptions.url) {
            return true;
        }

        if (initialOptions.mainWindowOptions && initialOptions.mainWindowOptions.url) {
            return true;
        }
    }

    return false;
};

// Type here should be ApplicationInfo from the js-adapter (needs to be updated)
export const wasCreatedFromManifest = (app: ApplicationInfo, uuid?: string) => {
    const {manifest} = app as AppInfo;
    const appUuid = uuid || undefined;
    return typeof manifest === 'object' && app.manifestUrl && manifest.startup_app && manifest.startup_app.uuid === appUuid;
};

export function parseVersionString(versionString: string): SemVer {
    const match = /([1-9]+)\.([0-9]+)\.([0-9]+)/.exec(versionString);
    if (!match) {
        throw new Error('Invalid version string. Must be in semver format ("a.b.c")');
    }

    return {major: Number.parseInt(match[1], 10), minor: Number.parseInt(match[2], 10), patch: Number.parseInt(match[3], 10)};
}
