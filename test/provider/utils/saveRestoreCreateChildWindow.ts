import {getConnection} from './connect';

// tslint:disable-next-line:no-any
export const saveRestoreCreateChildWindow = async (uuid: string) => {
    const fin = await getConnection();
    const client = await fin.InterApplicationBus.Channel.connect(uuid);
    await client.dispatch('createWindow');
};