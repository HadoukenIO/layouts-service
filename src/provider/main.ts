import {ProviderIdentity} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/channel';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {TabAPI} from '../client/APITypes';

import {SnapGroup} from './snapanddock/SnapGroup';
import {SnapService} from './snapanddock/SnapService';
import {SnapWindow, WindowIdentity} from './snapanddock/SnapWindow';
import {win10Check} from './snapanddock/utils/platform';
import {TabService} from './tabbing/TabService';
import {deregisterWindow, generateLayout} from './workspaces/create';
import {getAppToRestore, restoreApplication, restoreLayout} from './workspaces/restore';

export let snapService: SnapService;
export let tabService: TabService;
export let providerChannel: ChannelProvider;
declare const window: Window&{
    providerChannel: ChannelProvider;
    snapService: SnapService;
    tabService: TabService;
};

fin.desktop.main(main);

async function registerService() {
    providerChannel = window.providerChannel = await fin.InterApplicationBus.Channel.create();
    providerChannel.onConnection((app, payload) => {
        if (payload && payload.version && payload.version.length > 0) {
            console.log(`connection from client: ${app.name}, version: ${payload.version}`);
        } else {
            console.log(`connection from client: ${app.name}, unable to determine version`);
        }
    });
    providerChannel.register('undockWindow', (identity: WindowIdentity) => {
        snapService.undock(identity);
    });
    providerChannel.register('deregister', (identity: WindowIdentity) => {
        snapService.deregister(identity);
        tabService.apiHandler.deregister(identity);
        deregisterWindow(identity);
    });
    providerChannel.register('undockGroup', (identity: WindowIdentity) => {
        snapService.explodeGroup(identity);
    });
    providerChannel.register('generateLayout', generateLayout);
    providerChannel.register('restoreLayout', restoreLayout);
    providerChannel.register('appReady', (payload: void, identity: Identity) => {
        const {uuid} = identity;
        const appToRestore = getAppToRestore(uuid);
        if (appToRestore) {
            const {layoutApp, resolve} = appToRestore;
            restoreApplication(layoutApp, resolve);
        }
    });

    // Register listeners for window added/removed signals
    snapService.onWindowAdded.add((group, window) => {
        if (group.length < 2) {
            return;
        }
        sendWindowServiceMessage(GroupEventType.JOIN_SNAP_GROUP, window, providerChannel);
    });
    snapService.onWindowRemoved.add((group, window) => {
        if (group.length === 0) {
            return;
        }
        sendWindowServiceMessage(GroupEventType.LEAVE_SNAP_GROUP, window, providerChannel);
    });

    providerChannel.register(TabAPI.CLOSETABGROUP, tabService.apiHandler.closeTabGroup.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.CREATETABGROUP, tabService.apiHandler.createTabGroup.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.STARTDRAG, tabService.apiHandler.startDrag.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.ENDDRAG, tabService.apiHandler.endDrag.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.GETTABS, tabService.apiHandler.getTabs.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.MAXIMIZETABGROUP, tabService.apiHandler.maximizeTabGroup.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.MINIMIZETABGROUP, tabService.apiHandler.minimizeTabGroup.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.REMOVETAB, tabService.apiHandler.removeTab.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.CLOSETAB, tabService.apiHandler.closeTab.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.REORDERTABS, tabService.apiHandler.reorderTabs.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.RESTORETABGROUP, tabService.apiHandler.restoreTabGroup.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.SETACTIVETAB, tabService.apiHandler.setActiveTab.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.SETTABCLIENT, tabService.apiHandler.setTabClient.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.UPDATETABPROPERTIES, tabService.apiHandler.updateTabProperties.bind(tabService.apiHandler));
    providerChannel.register(TabAPI.ADDTAB, tabService.apiHandler.addTab.bind(tabService.apiHandler));
    return providerChannel;
}

export async function main() {
    snapService = window.snapService = new SnapService();
    tabService = window.tabService = new TabService();
    await win10Check;


    fin.desktop.InterApplicationBus.subscribe('*', 'layoutsService:experimental:disableTabbing', (message, uuid, name) => {
        TabService.INSTANCE.disableTabbingOperations = message;
    });

    fin.desktop.Application.getCurrent().addEventListener('run-requested', (event) => {
        if (event.userAppConfigArgs && event.userAppConfigArgs.disableTabbingOperations) {
            TabService.INSTANCE.disableTabbingOperations = event.userAppConfigArgs.disableTabbingOperations ? true : false;
        }
    });

    function getParameter(paramName: string) {
        const searchString = window.location.search.substring(1);
        const params = searchString.split('&');
        let i, val;

        for (i = 0; i < params.length; i++) {
            val = params[i].split('=');
            if (val[0] === paramName) {
                return val[1];
            }
        }
        return null;
    }

    TabService.INSTANCE.disableTabbingOperations = getParameter('disableTabbingOperations') ? true : false;

    return await registerService();
}

/**
 * Sends a service message to the specified SnapWindow
 * @param {GroupEventType} action The type of event being raised. The client will listen based on this value.
 * @param {SnapWindow} window The target to which the message will be sent
 * @param {fin.OpenFinServiceProvider} provider Provider object wrapping an instance of the openfin layouts service
 */
function sendWindowServiceMessage(action: GroupEventType, window: SnapWindow, provider: ChannelProvider) {
    const {uuid, name} = window.getIdentity();
    const to: ProviderIdentity|undefined = provider.connections.find(conn => conn.uuid === uuid && conn.name === name);
    if (to) {
        console.log('Dispatching window message: ', action, 'to window: ', window.getIdentity());
        provider.dispatch(to, action, {});
    }
}

/**
 * List of the valid grouping events that can be passed to the client.
 */
export enum GroupEventType {
    JOIN_SNAP_GROUP = 'join-snap-group',
    LEAVE_SNAP_GROUP = 'leave-snap-group',
    JOIN_TAB_GROUP = 'join-tab-group',
    LEAVE_TAB_GROUP = 'leave-tab-group'
}
