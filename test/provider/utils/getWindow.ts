import {Identity, Window} from 'hadouken-js-adapter';

import {fin} from '../../demo/utils/fin';

export type Win = Window|Identity;

export const getWindow = async (identityOrWindow: Win) => {
    // We check constructor name as `instanceof Window` cannot be relied on in the Jest environment
    if ((identityOrWindow as any).constructor.name === '_Window') {  // tslint:disable-line:no-any
        return identityOrWindow as Window;
    }
    const identity = identityOrWindow as Identity;

    // We extract fields from identity here as an extra guard against passing a full window into wrap,
    // which can cause serialization problems later
    return fin.Window.wrap({uuid: identity.uuid, name: identity.name});
};
