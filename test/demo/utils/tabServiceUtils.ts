import {Identity} from 'hadouken-js-adapter';

import {TabIdentifier} from '../../../src/client/types';
import {Tab} from '../../../src/provider/tabbing/Tab';
import {TabGroup} from '../../../src/provider/tabbing/TabGroup';

import {executeJavascriptOnService} from './executeJavascriptOnService';

export async function getTabGroupID(identity: Identity): Promise<string|null> {
    function remoteFunc(this: Window, identity: Identity): string|null {
        const tabGroup = this.tabService.getTabGroupByApp(identity as TabIdentifier);
        return tabGroup && tabGroup.ID ? tabGroup.ID : null;
    }
    return executeJavascriptOnService<Identity, string|null>(remoteFunc, identity);
}

export async function getTabbedWindows(identity: Identity): Promise<Identity[]> {
    function remoteFunc(this: Window, identity: Identity): Identity[] {
        const tabGroup: TabGroup|undefined = this.tabService.getTabGroupByApp(identity as TabIdentifier);
        if (tabGroup && tabGroup.tabs) {
            return tabGroup.tabs.map((tab: Tab) => tab.ID);
        } else {
            return [identity];
        }
    }
    return executeJavascriptOnService<Identity, Identity[]>(remoteFunc, identity);
}