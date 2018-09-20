import {ProviderIdentity} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/channel';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';
import {TabAPI} from '../client/APITypes';
import {DesktopModel} from './model/DesktopModel';
import {DesktopWindow, WindowIdentity} from './model/DesktopWindow';
import {SnapService} from './snapanddock/SnapService';
import {win10Check} from './snapanddock/utils/platform';
import {TabService} from './tabbing/TabService';
import {generateLayout} from './workspaces/create';
import {getAppToRestore, restoreApplication, restoreLayout} from './workspaces/restore';

export let model: DesktopModel;
export let snapService: SnapService;
export let tabService: TabService;
export let providerChannel: ChannelProvider;
declare const window: Window&{
    model: DesktopModel;
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
        model.deregister(identity);
        tabService.apiHandler.deregister(identity);
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
    model = window.model = new DesktopModel();
    snapService = window.snapService = new SnapService(model);
    tabService = window.tabService = new TabService(model);
    await win10Check;
    return await registerService();
}
