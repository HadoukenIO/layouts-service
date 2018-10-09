import {Fin} from 'hadouken-js-adapter';

import {getConnection} from './connect';
import { _Window } from 'hadouken-js-adapter/out/types/src/api/window/window';

const getClientConnection = async () => {
    const fin = await getConnection();
    const client = fin.InterApplicationBus.Channel.connect({uuid: 'testApp'});
    return client;
};
const clientPromise = getClientConnection();
let childWindowCount = 1;

export const createChildWindow = async (windowOptions: fin.WindowOptions) => {
    const fin = await getConnection();
    const client = await clientPromise;
    await client.dispatch('createWindow', {...windowOptions, uuid: 'testApp', name: 'win' + childWindowCount});
    const winP = fin.Window.wrap({uuid: 'testApp', name: 'win' + childWindowCount++});
    winP.then((win) => win.addListener('closed', () => {
        childWindowCount--;
    }));
    return winP;
};
