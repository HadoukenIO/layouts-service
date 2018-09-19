import {Identity} from 'hadouken-js-adapter';

import {executeJavascriptOnService} from './executeJavascriptOnService';

export async function isWindowRegistered(identity: Identity): Promise<boolean> {
    return executeJavascriptOnService<boolean>(`!!snapService.getSnapWindow({name:'${identity.name}', uuid:'${identity.uuid}'})`);
}

export async function getGroupedWindows(identity: Identity): Promise<Identity[]> {
    return executeJavascriptOnService<Identity[]>(`
        snapService.getSnapWindow({name:'${identity.name}', uuid:'${identity.uuid}'})
            .group.windows.map(win => {
                return win.getIdentity();
            });
    `);
}