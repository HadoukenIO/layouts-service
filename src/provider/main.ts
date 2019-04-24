import {Identity} from 'hadouken-js-adapter';
import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {ConfigurationObject} from '../../gen/provider/config/layouts-config';
import {SERVICE_CHANNEL} from '../client/internal';

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

const supportedScaleFactors = [1, 1.5, 2];

export async function main() {
    const monitorInfo = await fin.System.getMonitorInfo();

    // Disable the service if display scaling is not a supported scale factor
    if (!supportedScaleFactors.some(scaleFactor => scaleFactor === monitorInfo.deviceScaleFactor)) {
        console.error('Desktop has non-standard display scaling. Notifying user and disabling all layouts functionality.');

        const errorMessage = `\
OpenFin Layouts will only work with monitors that are set to a scaling ratio of 100%, 150% or 200%. \
This can be changed in monitor or display settings.
\n\n\
Please contact support@openfin.co with any further questions.`;

        const providerChannel: ChannelProvider = await fin.InterApplicationBus.Channel.create(SERVICE_CHANNEL);
        providerChannel.onConnection((app: Identity) => {
            providerChannel.dispatch(app, 'WARN', errorMessage);
        });
        providerChannel.setDefaultAction(() => {
            throw Error(errorMessage);
        });

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
