import {Identity} from 'hadouken-js-adapter';

export interface WindowIdentity extends Identity {
    uuid: string;
    name: string;
}

/**
 * Converts an identity into a string ID.
 *
 * @param identity Any entity identity
 */
export function getId(identity: WindowIdentity): string {
    return `${identity.uuid}/${identity.name}`;
}
