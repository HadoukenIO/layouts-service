import {Identity, Window} from 'hadouken-js-adapter';

import {fin} from '../../demo/utils/fin';

export type Win = Window|Identity;

export const getWindow = async (identityOrWindow: Win) => {
    if ((identityOrWindow as any).constructor.name === '_Window') {  // tslint:disable-line:no-any
        return identityOrWindow as Window;
    }
    const identity = identityOrWindow as Identity;

    return fin.Window.wrap({uuid: identity.uuid, name: identity.name});
};
