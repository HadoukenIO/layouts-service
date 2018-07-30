import {Provider} from 'hadouken-js-adapter/out/types/src/api/services/provider';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {saveCurrentLayout, saveLayoutObject} from './create';
import {getAppToRestore, restoreApplication, restoreLayout} from './restore';
import {getAllLayoutNames, getLayout} from './storage';

// tslint:disable-next-line:no-any
declare var fin: any;

// ENTRY POINT
export async function registerService(): Promise<Provider> {
    const providerChannel = await fin.desktop.Service.register('layouts');
    providerChannel.register('saveCurrentLayout', saveCurrentLayout);
    providerChannel.register('saveLayoutObject', saveLayoutObject);
    providerChannel.register('getLayout', getLayout);
    providerChannel.register('restoreLayout', restoreLayout);
    providerChannel.register('getAllLayoutNames', getAllLayoutNames);
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
