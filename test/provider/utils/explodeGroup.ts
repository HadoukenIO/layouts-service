import {getConnection} from './connect';
import { Fin } from 'hadouken-js-adapter';

// TODO - Change client/service file structure to allow importing these values
export interface WindowIdentity {
    uuid: string;
    name: string;
}

const getClientConnection = async () => {
    const fin:Fin = await getConnection();
    return fin.InterApplicationBus.Channel.connect({uuid: 'layouts-service'});
};

export async function explodeGroup(identity: WindowIdentity) {
    const client = await getClientConnection();
    await client.dispatch('undockGroup', identity);
}
