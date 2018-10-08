import {Identity} from 'hadouken-js-adapter';
import {executeJavascriptOnService} from './executeJavascriptOnService';
import { TabGroup, Tab } from '../../providerTypes';

export async function getTabGroupID(identity: Identity): Promise<string | null> {
    function remoteFunc(this: Window, identity: Identity): string | null {
        const tabGroup = this.tabService.getTabGroupByApp(identity);
        return tabGroup && tabGroup.ID? tabGroup.ID : null;
    }
    return executeJavascriptOnService<Identity, string | null>(remoteFunc, identity);
}

export async function getTabbedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: Window, identity: Identity): Identity[] {
        const tabGroup: TabGroup | undefined = this.tabService.getTabGroupByApp(identity);
        if (tabGroup && tabGroup.tabs) {
            return tabGroup.tabs.map((tab: Tab) => tab.ID);
        } else {
            return [identity];
        }
    }
    return executeJavascriptOnService<Identity, Identity[]>(remoteFunc, identity);
}