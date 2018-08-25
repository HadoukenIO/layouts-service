import {Api} from './Api';
import {AppApiEvents} from './APITypes';
import {ServiceIABTopics, TabIdentifier, TabServiceID, TabWindowOptions} from './types';

export class AppApi extends Api {
    private _ID: TabIdentifier;

    constructor() {
        super();
        this._ID = {uuid: fin.desktop.Application.getCurrent().uuid, name: fin.desktop.Window.getCurrent().name};

        // this.setTabClient('');
    }

    /**
     * Sets the url for the tab
     * @param url The url for the custom tab
     */
    public setTabClient(url: string, height?: number): void {
        fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, ServiceIABTopics.CLIENTINIT, {url, height});

        // Give the frame back if our service dies
        fin.desktop.Window.wrap(TabServiceID.UUID, TabServiceID.NAME).addEventListener('closed', () => {
            fin.desktop.Window.getCurrent().updateOptions({frame: true});
        });
    }

    public deregister() {
        fin.desktop.InterApplicationBus.send(TabServiceID.UUID, TabServiceID.NAME, AppApiEvents.DEREGISTER, {});
    }
}

(window as Window & {TabClient: AppApi}).TabClient = new AppApi();
