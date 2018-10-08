import { ChannelProvider } from "hadouken-js-adapter/out/types/src/api/interappbus/channel/provider";
import { TabBlob } from "../src/client/types";
import { SnapService } from "../src/provider/snapanddock/SnapService";
import { TabService } from "../src/provider/tabbing/TabService";

declare global {
    interface Window {
        snapService: SnapService;
        tabService: TabService;
        providerChannel: ChannelProvider

        createTabGroupsFromTabBlob(tabBlob: TabBlob[]): Promise<void>
    }
}