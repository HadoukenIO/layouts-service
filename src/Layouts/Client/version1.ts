/*tslint:disable:no-any*/
import { promiseMap } from '../../SnapAndDock/Service/utils/async';
import { Layout, LayoutApp, LayoutName } from '../types';
import { Identity } from 'hadouken-js-adapter/out/types/src/identity';
import { ServiceClient } from '../../SnapAndDock/Client/util';

declare var fin: any;
declare var window: {
  layoutsChannel: ServiceClient;
  layoutsApi: any;
};

let layoutsChannel: ServiceClient;
const layoutsUuid = 'Layout-Manager';
fin.desktop.Service.connect({ uuid: layoutsUuid }).then((channel:any) => {
    window.layoutsChannel = layoutsChannel = channel;
    // Any unregistered action will simply return false
    channel.setDefaultAction(()=>false);
    // channel.beforeAction(console.log);
    // channel.afterAction(console.log);
});

export default {
    // decide which parts of this you will implement, alter LayoutApp object to reflect this then send it back
    onWillSaveLayout: (layoutDecorator: (layoutApp: LayoutApp) => LayoutApp|false): void => {
        layoutsChannel.register('savingLayout', layoutDecorator);
    }, 
    // get the layoutApp object, implement, then return implemented LayoutApp object (minus anything not implemented)
    onAppRestore: (layoutDecorator: (layoutApp: LayoutApp) => LayoutApp|false): void => {
        layoutsChannel.register('restoreApp', layoutDecorator);
    },
    // any time the service saves a layout locally, it also sends to this route (could use own service here)
    onLayoutSave: (listener: (layout: Layout) => any): void => {
        layoutsChannel.register('layoutSaved', listener);
    },
    // Service will send out the restored layout with any changes from client connections
    onLayoutRestore: (listener: (layoutApp: LayoutApp) => any): void => {
        layoutsChannel.register('layoutRestored', listener);
    },
    // set the current layout (if sting is sent it becomes layout name - if object, it becomes the layout)
    setLayout: (payload: LayoutName|Layout): Promise<Layout> => {
        return layoutsChannel.dispatch('setLayout', payload);
    },
    // get a previously saved layout 
    getLayout: (name: LayoutName): Promise<Layout> => {
        return layoutsChannel.dispatch('getLayout', name);
    },
    // restore a previously saved layout - in v2, can restore from your own layout object
    restoreLayout: (payload: LayoutName|Layout): Promise<Layout> => {
        return layoutsChannel.dispatch('restoreLayout', payload);
    },
    ready: (): Promise<Layout> => {
        return layoutsChannel.dispatch('appReady');
    },
};




