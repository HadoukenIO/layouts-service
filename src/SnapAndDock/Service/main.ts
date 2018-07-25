import {SnapGroup} from './SnapGroup';
import {SnapService} from './SnapService';
import {SnapWindow} from './SnapWindow';
import {win10Check} from './utils/platform';

interface ServiceWindow extends Window {
    service: SnapService;
}

fin.desktop.main(main);

async function init() {
    await win10Check;
    return await registerService();
}

async function registerService() {
    const providerChannel = await fin.desktop.Service.register();
    providerChannel.register('undock', (identity) => {
        (window as ServiceWindow).service.undock(identity);
    });
    providerChannel.register('deregister', (identity) => {
        (window as ServiceWindow).service.deregister(identity);
    });

    // Register listeners for window added/removed signals
    (window as ServiceWindow).service.onWindowAdded.add((group, window) => {
        if (group.length < 2) {
            return;
        }
        sendWindowServiceMessage(GroupEventType.JOIN_SNAP_GROUP, window, providerChannel);
    });
    (window as ServiceWindow).service.onWindowRemoved.add((group, window) => {
        if (group.length === 0) {
            return;
        }
        sendWindowServiceMessage(GroupEventType.LEAVE_SNAP_GROUP, window, providerChannel);
    });

    return providerChannel;
}

export function main() {
    // tslint:disable-next-line:no-any
    (window as ServiceWindow).service = new SnapService();
    //@ts-ignore
    return init();
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
