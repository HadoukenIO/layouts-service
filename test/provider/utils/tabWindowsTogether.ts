import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getTabGroupID, getTabGroupIdentity} from '../../demo/utils/tabServiceUtils';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';
import { executeJavascriptOnService } from '../../demo/utils/serviceUtils';

export async function tabWindowsTogether(target: _Window, windowToTab: _Window, expectSucceess = true, retries = 5) {
    const isTargetTabbed: boolean = await getTabGroupIdentity(target.identity) !== null;

    await executeJavascriptOnService(function(this: ProviderWindow, retries: number) {
        console.warn(`*** Starting drag, retries left ${retries}`);
    }, retries);

    await dragWindowToOtherWindow(windowToTab, 'top-left', target, 'top-left', {x: 10, y: isTargetTabbed ? -20 : 10});
    await delay(500);

    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.warn(`*** Ending drag`);
    });

    if (expectSucceess) {
        const targetTabGroupID = await getTabGroupID(target.identity);
        const windowToTabTabGroupID = await getTabGroupID(windowToTab.identity);

        if (targetTabGroupID === null || windowToTabTabGroupID === null) {
            if (retries > 0) {
                await delay(1000);
                console.warn(`**** Windows window not tabbed following tabWindowsTogether (${target.identity.uuid}/${target.identity.name}, ${windowToTab.identity.uuid}/${windowToTab.identity.name}). Retrying`);
                tabWindowsTogether(target, windowToTab, expectSucceess, retries - 1);
            } else {
                console.warn(`**** Windows window not tabbed following tabWindowsTogether (${target.identity.uuid}/${target.identity.name}, ${windowToTab.identity.uuid}/${windowToTab.identity.name})`);
    
                console.trace();
                console.warn(`**************************`);
            }
        }
    }
}