import {Fin} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {getConnection} from '../../provider/utils/connect';


/**
 * Executes javascript code on the service
 * @param script
 */
export async function executeJavascriptOnService<T>(script: string): Promise<T> {
    const fin: Fin = await getConnection();
    // @ts-ignore Hadouken types are wrong. `channelName` is a valid property
    return fin.InterApplicationBus.Channel.connect({uuid: 'layouts-service', name: 'layouts-service', channelName: 'layouts-provider-testing'})
        .then((channelClient: ChannelClient) => {
            return channelClient.dispatch('execute-javascript', script);
        });
}