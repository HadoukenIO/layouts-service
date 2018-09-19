import {Fin} from 'hadouken-js-adapter';

import {getConnection} from './connect';

// TODO - Change client/service file structure to allow importing these values
export interface WindowIdentity {
    uuid: string;
    name: string;
}

const getClientConnection = async () => {
    const fin: Fin = await getConnection();
    // @ts-ignore Hadouken types are wrong. `channelName` is a valid property
    return fin.InterApplicationBus.Channel.connect({uuid: 'layouts-service', channelName: 'layouts-service'});
};

export async function explodeGroup(identity: WindowIdentity) {
    const client = await getClientConnection();
    await client.dispatch('undockGroup', identity);
}
