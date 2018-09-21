import {Identity} from 'hadouken-js-adapter';

import {executeJavascriptOnService} from './executeJavascriptOnService';
import { TabService } from '../../../src/provider/tabbing/TabService';

export async function getTabGroupID(identity: Identity): Promise<string> {
    return executeJavascriptOnService<string>(`
        let remoteTabGroup = tabService.getTabGroupByApp({name:'${identity.name}', uuid:'${identity.uuid}'});
        remoteTabGroup && remoteTabGroup.ID? remoteTabGroup.ID : null;
    `);
}

export async function getTabbedWindows(identity: Identity): Promise<Identity[]> {
    return executeJavascriptOnService<Identity[]>(`
        tabService.getTabGroupByApp({name:'${identity.name}', uuid:'${identity.uuid}'})._tabs.map(tab => tab._tabID);
    `);
}

