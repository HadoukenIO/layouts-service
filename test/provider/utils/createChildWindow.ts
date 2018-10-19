import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from './connect';

let childWindowCount = 1;

const getClientConnection = async () => {
    const fin = await getConnection();
    return fin.InterApplicationBus.Channel.connect('test-app-comms');
};

getConnection().then(fin => {
    fin.System.addListener('window-closed', evt => {
        if (evt.uuid === 'testApp' && evt.name.match(/win\d/)) {
            childWindowCount--;
        }
    });
});

export const createChildWindow = async (windowOptions: fin.WindowOptions) => {
    const fin = await getConnection();
    const client = await getClientConnection();
    const windowName = 'win' + childWindowCount++;
    await client.dispatch('createWindow', {...windowOptions, uuid: 'testApp', name: windowName});

    const newWin = fin.Window.wrapSync({uuid: 'testApp', name: windowName});
    return newWin;
};
