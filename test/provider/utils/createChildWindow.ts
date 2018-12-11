import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getConnection} from './connect';

let childWindowCount = 1;

const getClientConnection = async (uuid: string) => {
    const fin = await getConnection();
    // Snap&Dock and Tabbing use a single app (`testApp`) to spawn child windows, while S&R uses multiple apps
    // Thus, our connection strings are different
    const connectionString = uuid === 'testApp' ? 'test-app-comms' : `test-comms-${uuid}`;

    return fin.InterApplicationBus.Channel.connect(connectionString);
};

getConnection().then(fin => {
    fin.System.addListener('window-closed', evt => {
        if (evt.uuid === 'testApp' && evt.name.match(/win\d/)) {
            childWindowCount--;
        }
    });
});

export const createChildWindow = async (windowOptions: fin.WindowOptions, uuid?: string) => {
    uuid = uuid || 'testApp';
    const fin = await getConnection();
    const client = await getClientConnection(uuid);

    const windowName: string = windowOptions.name || 'win' + childWindowCount++;
    await client.dispatch('createWindow', {...windowOptions, uuid, name: windowName});

    const newWin = fin.Window.wrapSync({uuid, name: windowName});
    return newWin;
};
