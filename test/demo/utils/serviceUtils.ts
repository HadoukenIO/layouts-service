import {ChannelClient} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

import {APITopic, SERVICE_CHANNEL} from '../../../src/client/internal';

import {fin} from './fin';

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
 * Executes JavaScript code on the service
 * @param func
 */
export async function executeJavascriptOnService<T, R>(func: ((data: T) => R | Promise<R>), data?: T): Promise<R> {
    return fin.InterApplicationBus.Channel.connect('layouts-provider-testing').then(async (channelClient: ChannelClient) => {
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

export async function sendServiceMessage<T, R>(message: APITopic, payload: T): Promise<R> {
    const client = await getChannelClient();
    return client.dispatch(message, payload);
}

async function getChannelClient() {
    return fin.InterApplicationBus.Channel.connect(SERVICE_CHANNEL);
}

Object.assign(global, {fin, PACKAGE_VERSION: 'TEST-CLIENT'});
export const layoutsClientPromise = import('../../../src/client/main');
