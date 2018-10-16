import {ChannelProvider} from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/provider';

import {TabBlob} from '../src/client/types';
import {DesktopModel} from '../src/provider/model/DesktopModel';
import {SnapService} from '../src/provider/snapanddock/SnapService';
import {TabService} from '../src/provider/tabbing/TabService';

declare global {
    interface ProviderWindow extends Window {
        model: DesktopModel;
        snapService: SnapService;
        tabService: TabService;
        providerChannel: ChannelProvider;
    }
}