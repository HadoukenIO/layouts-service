import {Fin} from 'hadouken-js-adapter';

import {getConnection} from '../../provider/utils/connect';


/**
 * Executes javascript code on the service
 * @param script
 */
// tslint:disable-next-line:no-any
export async function executeJavascriptOnService(script: string): Promise<any> {
    const fin: Fin = await getConnection();
    return new Promise((resolve, reject) => {
        fin.InterApplicationBus.subscribe({uuid: 'layouts-service', name: 'layouts-service'}, 'replytest', (message: string) => {
            console.log(message);
            resolve(message);
        });
        fin.InterApplicationBus.send({uuid: 'layouts-service', name: 'layouts-service'}, 'test', script);
    });
}