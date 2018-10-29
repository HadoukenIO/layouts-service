import {Identity} from 'hadouken-js-adapter';
import {RunRequestedEvent} from 'hadouken-js-adapter/out/types/src/api/events/application';

import {APIHandler} from './APIHandler';
import {DesktopModel} from './model/DesktopModel';
import {DesktopWindow} from './model/DesktopWindow';
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

interface SupportedArguments {
    disableTabbingOperations: boolean;
    disableDockingOperations: boolean;
    emulateDragEvents: boolean;
}
type Stringified<T> = {
    [P in keyof T]?: string;
};

export async function main() {
    model = window.model = new DesktopModel();
    snapService = window.snapService = new SnapService(model);
    tabService = window.tabService = new TabService(model);
    apiHandler = window.apiHandler = new APIHandler();

    fin.InterApplicationBus.subscribe({uuid: '*'}, 'layoutsService:experimental:disableTabbing', (message: boolean, source: Identity) => {
        tabService.disableTabbingOperations = message;
    });
    fin.InterApplicationBus.subscribe({uuid: '*'}, 'layoutsService:experimental:disableDocking', (message: boolean, source: Identity) => {
        snapService.disableDockingOperations = message;
    });

    fin.Application.getCurrentSync().addListener('run-requested', (event: RunRequestedEvent<'application', 'run-requested'>) => {
        processUserArgs(event.userAppConfigArgs);
    });
    fin.Window.getCurrentSync().getOptions().then((options: fin.WindowOptions) => {
        //@ts-ignore userAppConfigArgs is returned by this function, but missing from types
        processUserArgs(options.userAppConfigArgs);
    });

    function processUserArgs(args: Stringified<SupportedArguments>): void {
        if (args) {
            if (args.disableTabbingOperations) {
                tabService.disableTabbingOperations = args.disableTabbingOperations === 'true';
            }
            if (args.disableDockingOperations) {
                snapService.disableDockingOperations = args.disableDockingOperations === 'true';
            }
            if (args.emulateDragEvents) {
                DesktopWindow.emulateDragEvents = args.emulateDragEvents === 'true';
            }
        }
    }

    await win10Check;
    await apiHandler.register();
}
