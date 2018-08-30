import * as Layouts from '../../../client/main';
import { TabGroupEventPayload } from '../../../client/types';

declare var fin: any;

fin.desktop.main(() => {
    Layouts.addEventListener('join-tab-group', (event: CustomEvent<TabGroupEventPayload> | Event) => {
        console.log("Tab added");
    });

    Layouts.addEventListener('leave-tab-group', (event: CustomEvent<TabGroupEventPayload> | Event) => {
        console.log("Tab closed");
    });
});

(window as Window & { setTabClient: Function }).setTabClient = Layouts.setTabClient;