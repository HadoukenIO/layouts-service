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


// Connect to the service
export const connectToService = async () => {
    await fin.desktop.Service.connect({uuid: layoutsUuid, name: layoutsUuid}).then((channel: ServiceClient) => {
        window.layoutsChannel = layoutsChannel = channel;
        // Any unregistered action will simply return false
        channel.setDefaultAction(() => false);
    });
};
// Decide which parts of this you will implement, alter LayoutApp object to reflect this then send it back
export const onWillSaveAppLayout = (layoutDecorator: (layoutApp: LayoutApp) => LayoutApp | false): void => {
    layoutsChannel.register('savingLayout', layoutDecorator);
};
// Get the layoutApp object, implement, then return implemented LayoutApp object (minus anything not implemented)
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
// Set the current layout
export const saveCurrentLayout = (payload: LayoutName): Promise<Layout> => {
    return layoutsChannel.dispatch('saveCurrentLayout', payload);
};
// Set layout by sending a Layout object
export const saveLayoutObject = (payload: Layout): Promise<Layout> => {
    return layoutsChannel.dispatch('saveLayoutObject', payload);
};
// Get a previously saved layout
export const getLayout = (name: LayoutName): Promise<Layout> => {
    return layoutsChannel.dispatch('getLayout', name);
};
// Get the names of all previously saved layouts
export const getAllLayoutNames = (): Promise<LayoutName[]> => {
    return layoutsChannel.dispatch('getAllLayoutNames', name);
};
// Restore a previously saved layout - in v2, can restore from your own layout object
export const restoreLayout = (payload: LayoutName|Layout): Promise<Layout> => {
    return layoutsChannel.dispatch('restoreLayout', payload);
};
// Send this to the service when you have registered all routes after registration
export const ready = (): Promise<Layout> => {
    return layoutsChannel.dispatch('appReady');
};
