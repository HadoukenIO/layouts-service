import {getConnection} from './connect';
import { Fin } from 'hadouken-js-adapter';

const getClientConnection = async () => {
    const fin = await getConnection();
    const client = fin.InterApplicationBus.Channel.connect({uuid: 'testApp'});
    return client;
};
const clientPromise = getClientConnection();
let childWindowCount = 1;

// tslint:disable-next-line:no-any
export const createChildWindow = async (windowOptions:any) => {
    const fin = await getConnection();
    const client = await clientPromise;
    await client.dispatch('createWindow', {...windowOptions, uuid: 'testApp', name: 'win' + childWindowCount});
    const winP = fin.Window.wrap({uuid: 'testApp', name: 'win' + childWindowCount++});
    winP.then((win) => win.addListener('closed',() => {childWindowCount--;}));
    return winP;
};
