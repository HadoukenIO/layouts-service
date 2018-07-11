import {Provider} from 'hadouken-js-adapter/out/types/src/api/services/provider';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {setLayout} from './create';
import {getAppToRestore, restoreApplication, restoreLayout} from './restore';
import {getLayout} from './storage';

// tslint:disable-next-line:no-any
declare var fin: any;

// ENTRY POINT
export async function registerService(): Promise<Provider> {
    const providerChannel = await fin.desktop.Service.register('layouts');
    providerChannel.register('setLayout', setLayout);
    providerChannel.register('getLayout', getLayout);
    providerChannel.register('restoreLayout', restoreLayout);
    providerChannel.register('appReady', (payload: void, identity: Identity) => {
        const {uuid} = identity;
        const appToRestore = getAppToRestore(uuid);
        if (appToRestore) {
            const {layoutApp, resolve} = appToRestore;
            restoreApplication(layoutApp, resolve);
        }
    });
    return providerChannel;
}