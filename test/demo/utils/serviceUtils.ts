
import {Fin} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {CHANNEL_NAME} from '../../../src/client/types';

import {getConnection} from '../../provider/utils/connect';

/**
 * Executes javascript code on the service
 * @param func
 */
export async function executeJavascriptOnService<T, R>(func: ((data: T) => R), data?: T): Promise<R> {
    const fin: Fin = await getConnection();
    // @ts-ignore Hadouken types are wrong. `channelName` is a valid property
    return fin.InterApplicationBus.Channel.connect({uuid: 'layouts-service', name: 'layouts-service', channelName: 'layouts-provider-testing'})
        .then((channelClient: ChannelClient) => {
            return channelClient.dispatch('execute-javascript', {script: func.toString(), data});
        });
}

export async function sendServiceMessage<T, R>(message: string, payload: T): Promise<R> {
    const client = await getServiceClient();
    return client.dispatch(message, payload);
}

async function getServiceClient() {
    const fin: Fin = await getConnection();
    // @ts-ignore Hadouken types are wrong. `channelName` is a valid property
    return fin.InterApplicationBus.Channel.connect({uuid: 'layouts-service', channelName: CHANNEL_NAME});
}