import {Identity} from 'hadouken-js-adapter';
import {RunRequestedEvent} from 'hadouken-js-adapter/out/types/src/api/events/application';

import {ConfigurationObject} from '../../gen/provider/config/layouts-config';

import {APIHandler} from './APIHandler';
import {Loader} from './config/Loader';
import {Store} from './config/Store';
import {DesktopModel} from './model/DesktopModel';
import {DesktopTabGroup} from './model/DesktopTabGroup';
import {SnapService} from './snapanddock/SnapService';
import {win10Check} from './snapanddock/utils/platform';
import {TabService} from './tabbing/TabService';
import {WindowHandler} from './WindowHandler';

export type ConfigStore = Store<ConfigurationObject>;

export let config: Store<ConfigurationObject>;
export let loader: Loader<ConfigurationObject>;
export let model: DesktopModel;
export let snapService: SnapService;
export let tabService: TabService;
export let apiHandler: APIHandler;
export let windowHandler: WindowHandler;

declare const window: Window&{
    config: ConfigStore;
    loader: Loader<ConfigurationObject>;
    model: DesktopModel;
    snapService: SnapService;
    tabService: TabService;
    apiHandler: APIHandler;
};

fin.desktop.main(main);

interface SupportedArguments {
    disableTabbingOperations: boolean;
    disableDockingOperations: boolean;
}
type Stringified<T> = {
    [P in keyof T]?: string;
};

export async function main() {
    config = window.config = new Store(require('../../gen/provider/config/defaults.json'));
    loader = window.loader = new Loader(config, 'layouts');
    model = window.model = new DesktopModel(config);
    windowHandler = new WindowHandler(model);
    snapService = window.snapService = new SnapService(model, config);
    tabService = window.tabService = new TabService(model, config);
    apiHandler = window.apiHandler = new APIHandler(model, config, snapService, tabService);


    // Need to ensure that `DesktopTabstripFactory` is created synchronously at service startup.
    // This ensures that it's watch listeners are active at the point where any application-specific tabstrips are configured.
    DesktopTabGroup.windowPool;  // tslint:disable-line:no-unused-expression


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
            console.log('Using URL config:', args);

            if (args.disableTabbingOperations) {
                tabService.disableTabbingOperations = args.disableTabbingOperations === 'true';
            }
            if (args.disableDockingOperations) {
                snapService.disableDockingOperations = args.disableDockingOperations === 'true';
            }
        }
    }

    await win10Check;
    await apiHandler.register();
}
