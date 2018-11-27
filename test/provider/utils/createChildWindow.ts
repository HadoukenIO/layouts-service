import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from './connect';

let childWindowCount = 1;

const getClientConnection = async (uuid?: string) => {
    uuid = uuid || 'test-app-comms';
    const fin = await getConnection();
    return fin.InterApplicationBus.Channel.connect(uuid);
};

getConnection().then(fin => {
    fin.System.addListener('window-closed', evt => {
        if (evt.uuid === 'testApp' && evt.name.match(/win\d/)) {
            childWindowCount--;
        }
    });
});

export const createChildWindow = async (windowOptions: fin.WindowOptions, uuid?: string) => {
    uuid = uuid || 'testapp';
    const fin = await getConnection();
    const client = await getClientConnection(uuid);
    const windowName = windowOptions.name ? windowOptions.name : 'win' + childWindowCount++;
    await client.dispatch('createWindow', {...windowOptions, uuid, name: windowName});

    const newWin = fin.Window.wrapSync({uuid, name: windowName});
    return newWin;
};
