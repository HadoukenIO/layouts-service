import {Fin, Identity} from 'hadouken-js-adapter';

import {getConnection} from '../../provider/utils/connect';

// tslint:disable-next-line:no-any
type ExecuteResult = any;

/**
 * Executes javascript code on the service
 * @param script
 */
export async function executeJavascriptOnService(script: string): Promise<ExecuteResult> {
    const fin: Fin = await getConnection();
    return new Promise((resolve, reject) => {
        const serviceIdentity: Identity = {uuid: 'layouts-service', name: 'layouts-service'};
        const callback = (message: {success: boolean; result: ExecuteResult; type: string}) => {
            fin.InterApplicationBus.unsubscribe(serviceIdentity, 'executeJavascriptResult', callback);

            console.log(message);

            if (message.success) {
                let result = message.result;
                try {
                    // Seems IAB strips-out any properties that are undefined - avoid trying to parse invalid value
                    if (message.type !== 'undefined') {
                        result = JSON.parse(result);
                    }
                } catch (e) {
                    console.warn('Expected result to be stringified, but wasn\'t:', result, typeof result);
                }

                resolve(result);
            } else {
                reject(message.result);
            }
        };

        fin.InterApplicationBus.subscribe(serviceIdentity, 'executeJavascriptResult', callback);
        fin.InterApplicationBus.send(serviceIdentity, 'executeJavascript', script);
    });
}
