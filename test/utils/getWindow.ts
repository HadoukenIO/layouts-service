import {Identity, Window} from 'hadouken-js-adapter';

import {getConnection} from './connect';

export type Win = Window|Identity;

export const getWindow = async (identityOrWindow: Win) => {
    if (identityOrWindow instanceof Window) {
        return identityOrWindow;
    }
    const fin = await getConnection();
    return fin.Window.wrap(identityOrWindow);
};
