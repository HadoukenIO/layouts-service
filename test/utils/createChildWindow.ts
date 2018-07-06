import {getConnection} from './connect';
import { Fin } from 'hadouken-js-adapter';

const getClientConnection = async () => {
    const fin = await getConnection();
    let client = fin.Service.connect({uuid: 'testApp'});
    return client;
};
const clientPromise = getClientConnection();
let childWindowCount = 0;

export const createChildWindow = async (windowOptions:any) => {
    const fin = await getConnection();
    const client = await clientPromise;
    await client.dispatch('createWindow', {...windowOptions, uuid: 'testApp', name: 'win' + childWindowCount});
    return fin.Window.wrap({uuid: 'testApp', name: 'win' + childWindowCount++});
};
