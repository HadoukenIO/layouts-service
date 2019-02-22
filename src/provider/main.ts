import {ConfigurationObject} from '../../gen/provider/config/layouts-config';

import {APIHandler} from './APIHandler';
import {Loader} from './config/Loader';
import {Store} from './config/Store';
import {DesktopModel} from './model/DesktopModel';
import {DesktopTabGroup} from './model/DesktopTabGroup';
import {SnapService} from './snapanddock/SnapService';
import {win10Check} from './snapanddock/utils/platform';
import {TabService} from './tabbing/TabService';
import {createErrorBox} from './utils/error';
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

export async function main() {
    const monitorInfo = await fin.System.getMonitorInfo();

    // Disable the service if display scaling is not 100%
    if (monitorInfo.deviceScaleFactor !== 1) {
        console.error('Desktop has non-standard display scaling. Notifying user and disabling all layouts functionality.');

        const errorMessage =
            'OpenFin Layouts will not work with monitor which are not set to 100% a scaling ratio. This can be changed in monitor or display settings. \n\nPlease contact <a href="mailto:support@openfin.co">support@openfin.co</a> with any further questions.';
        const title = 'OpenFin Layouts Notice';
        await createErrorBox(title, errorMessage);
        return;  // NOTE: Service will still be running, but will not function.
    }

    config = window.config = new Store(require('../../gen/provider/config/defaults.json'));
    loader = window.loader = new Loader(config, 'layouts', {enabled: false});
    model = window.model = new DesktopModel(config);
    windowHandler = new WindowHandler(model);
    snapService = window.snapService = new SnapService(model, config);
    tabService = window.tabService = new TabService(model, config);
    apiHandler = window.apiHandler = new APIHandler(model, config, snapService, tabService);

    // Need to ensure that `DesktopTabstripFactory` is created synchronously at service startup.
    // This ensures that it's watch listeners are active at the point where any application-specific tabstrips are configured.
    DesktopTabGroup.windowPool;  // tslint:disable-line:no-unused-expression

    await win10Check;
    await apiHandler.registerListeners();
}


// Register the offline-mode service worker.
navigator.serviceWorker.register('./sw.js', {scope: './'});
