import {SnapGroup} from './snapanddock/SnapGroup';
import {SnapService} from './snapanddock/SnapService';
import {SnapWindow, WindowIdentity} from './snapanddock/SnapWindow';
import {win10Check} from './snapanddock/utils/platform';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {saveCurrentLayout, saveLayoutObject} from './workspaces/create';
import {getAppToRestore, restoreApplication, restoreLayout} from './workspaces/restore';
import {getAllLayoutNames, getLayout} from './workspaces/storage';
import { Provider } from 'hadouken-js-adapter/out/types/src/api/services/provider';

export let service: SnapService;
export let providerChannel: Provider;
declare const window: Window & {providerChannel: Provider; service: SnapService;};

fin.desktop.main(main);

async function registerService() {
    providerChannel = window.providerChannel = (await fin.desktop.Service.register()) as Provider;
    providerChannel.register('undock', (identity: WindowIdentity) => {
        window.service.undock(identity);
    });
    providerChannel.register('deregister', (identity: WindowIdentity) => {
        window.service.deregister(identity);
    });
    providerChannel.register('explode', (identity: WindowIdentity) => {
        window.service.explodeGroup(identity);
    });
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

    // Register listeners for window added/removed signals
    window.service.onWindowAdded.add((group, window) => {
        if (group.length < 2) {
            return;
        }
        sendWindowServiceMessage(GroupEventType.JOIN_SNAP_GROUP, window, providerChannel);
    });
    window.service.onWindowRemoved.add((group, window) => {
        if (group.length === 0) {
            return;
        }
        sendWindowServiceMessage(GroupEventType.LEAVE_SNAP_GROUP, window, providerChannel);
    });

    return providerChannel;
}

export async function main() {
    service = window.service = new SnapService();
    await win10Check;
    return await registerService();
}

/**
 * Sends a service message to the specified SnapWindow
 * @param {GroupEventType} action The type of event being raised. The client will listen based on this value.
 * @param {SnapWindow} window The target to which the message will be sent
 * @param {fin.OpenFinServiceProvider} provider Provider object wrapping an instance of the openfin layouts service
 */
function sendWindowServiceMessage(action: GroupEventType, window: SnapWindow, provider: fin.OpenFinServiceProvider) {
    console.log('Dispatching window message: ', action, 'to window: ', window.getIdentity());
    provider.dispatch(window.getIdentity(), action, {});
}

/**
 * List of the valid grouping events that can be passed to the client.
 */
export enum GroupEventType {
    JOIN_SNAP_GROUP = 'join-snap-group',
    LEAVE_SNAP_GROUP = 'leave-snap-group'
}
