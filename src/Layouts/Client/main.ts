/*tslint:disable:no-any*/
import {Client} from 'hadouken-js-adapter/out/types/src/api/services/client';
import {Identity} from 'hadouken-js-adapter/out/types/src/identity';

import {Layout, LayoutApp, LayoutName} from '../types';

type ServiceClient = Client;

declare var fin: any;
declare var window: {layoutsChannel: ServiceClient; layoutsApi: any;};

const VERSION = '0.0.1';

let layoutsChannel: ServiceClient;
const layoutsUuid = 'Layout-Manager';


// connect to the service
export const serviceReady = async () => {
    await fin.desktop.Service.connect({uuid: layoutsUuid, name: layoutsUuid}).then((channel: ServiceClient) => {
        window.layoutsChannel = layoutsChannel = channel;
        // Any unregistered action will simply return false
        channel.setDefaultAction(() => false);
    });
};
// decide which parts of this you will implement, alter LayoutApp object to reflect this then send it back
export const onWillSaveLayout = (layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false): void => {
    layoutsChannel.register('savingLayout', layoutDecorator);
};
// get the layoutApp object, implement, then return implemented LayoutApp object (minus anything not implemented)
export const onAppRestore = (layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false): void => {
    layoutsChannel.register('restoreApp', layoutDecorator);
};
// any time the service saves a layout locally, it also sends to this route (could use own service here)
export const onLayoutSave = (listener: (layout: Layout) => void): void => {
    layoutsChannel.register('layoutSaved', listener);
};
// Service will send out the restored layout with any changes from client connections
export const onLayoutRestore = (listener: (layoutApp: LayoutApp) => void): void => {
    layoutsChannel.register('layoutRestored', listener);
};
// set the current layout (if sting is sent it becomes layout name - if object, it becomes the layout)
export const setLayout = (payload: LayoutName|Layout): Promise<Layout> => {
    return layoutsChannel.dispatch('setLayout', payload);
};
// get a previously saved layout
export const getLayout = (name: LayoutName): Promise<Layout> => {
    return layoutsChannel.dispatch('getLayout', name);
};
// restore a previously saved layout - in v2, can restore from your own layout object
export const restoreLayout = (payload: LayoutName|Layout): Promise<Layout> => {
    return layoutsChannel.dispatch('restoreLayout', payload);
};
export const ready = (): Promise<Layout> => {
    return layoutsChannel.dispatch('appReady');
};
