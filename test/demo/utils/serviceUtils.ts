
import {Fin} from 'hadouken-js-adapter';
import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {CHANNEL_NAME} from '../../../src/client/types';

import {getConnection} from '../../provider/utils/connect';

interface RemoteExecSuccess<R> {
    success: true;
    result: R;
}
interface RemoteExecFailure {
    success: false;
    result: Error;
}
type RemoteExecResponse<R> = RemoteExecSuccess<R>|RemoteExecFailure;

/**
 * Executes javascript code on the service
 * @param func
 */
export async function executeJavascriptOnService<T, R>(func: ((data: T) => R | Promise<R>), data?: T): Promise<R> {
    const fin: Fin = await getConnection();
    // @ts-ignore Hadouken types are wrong. `channelName` is a valid property
    return fin.InterApplicationBus.Channel.connect({uuid: 'layouts-service', name: 'layouts-service', channelName: 'layouts-provider-testing'})
        .then(async (channelClient: ChannelClient) => {
            const response: RemoteExecResponse<R> = await channelClient.dispatch('execute-javascript', {script: func.toString(), data});
            if (response.success) {
                return response.result;
            } else {
                // Reconstruct the error object from JSON
                const err = new Error();
                err.message = response.result.message;
                if (response.result.stack) {
                    err.stack = response.result.stack;
                }
                if (response.result.name) {
                    err.name = response.result.name;
                }

                throw err;
            }
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