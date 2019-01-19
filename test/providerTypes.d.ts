import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {DesktopModel} from '../src/provider/model/DesktopModel';
import {SnapService} from '../src/provider/snapanddock/SnapService';
import {TabService} from '../src/provider/tabbing/TabService';
import {ConfigStore} from '../src/provider/main';

declare global {
    interface ProviderWindow extends Window {
        model: DesktopModel;
        config: ConfigStore;
        snapService: SnapService;
        tabService: TabService;
        providerChannel: ChannelProvider;
    }
}