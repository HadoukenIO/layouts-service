import {Identity} from 'hadouken-js-adapter';

import {APIHandler} from './APIHandler';
import {DesktopModel} from './model/DesktopModel';
import {SnapService} from './snapanddock/SnapService';
import {win10Check} from './snapanddock/utils/platform';
import {TabService} from './tabbing/TabService';

export let model: DesktopModel;
export let snapService: SnapService;
export let tabService: TabService;
export let apiHandler: APIHandler;

declare const window: Window&{
    model: DesktopModel;
    snapService: SnapService;
    tabService: TabService;

    apiHandler: APIHandler;
};

fin.desktop.main(main);

export async function main() {
    model = window.model = new DesktopModel();
    snapService = window.snapService = new SnapService(model);
    tabService = window.tabService = new TabService(model);
    apiHandler = window.apiHandler = new APIHandler();

    fin.InterApplicationBus.subscribe({uuid: '*'}, 'layoutsService:experimental:disableTabbing', (message: boolean, source: Identity) => {
        tabService.disableTabbingOperations = message;
    });

    fin.Application.getCurrentSync().addListener('run-requested', (event) => {
        if (event.userAppConfigArgs && event.userAppConfigArgs.disableTabbingOperations) {
            tabService.disableTabbingOperations = event.userAppConfigArgs.disableTabbingOperations ? true : false;
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

    tabService.disableTabbingOperations = getParameter('disableTabbingOperations') ? true : false;

    await win10Check;
    await apiHandler.register();
}
