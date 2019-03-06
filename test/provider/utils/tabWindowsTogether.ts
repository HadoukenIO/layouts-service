import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getTabGroupID, getTabGroupIdentity} from '../../demo/utils/tabServiceUtils';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';
import { executeJavascriptOnService } from '../../demo/utils/serviceUtils';

export async function tabWindowsTogether(target: _Window, windowToTab: _Window, expectSucceess = true, retries = 5) {
    const isTargetTabbed: boolean = await getTabGroupIdentity(target.identity) !== null;

    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.warn(`*** Starting drag, retries left ${retries}`);
    });
    await dragWindowToOtherWindow(windowToTab, 'top-left', target, 'top-left', {x: 10, y: isTargetTabbed ? -20 : 10});
    await delay(500);

    await executeJavascriptOnService(function(this: ProviderWindow) {
        console.warn(`*** Ending drag`);
    });

    if (expectSucceess) {
        const targetTabGroupID = await getTabGroupID(target.identity);
        const windowToTabTabGroupID = await getTabGroupID(windowToTab.identity);

        if (targetTabGroupID === null || targetTabGroupID === null) {
            if (retries > 0) {
                await delay(1000);
                tabWindowsTogether(target, windowToTab, expectSucceess, retries - 1);
            } else {
                if (targetTabGroupID === null) {
                    console.warn(`**** Target window not tabbed following tabWindowsTogether (${target.identity.uuid}/${target.identity.name})`);
        
                    console.trace();
                    console.warn(`**************************`);
                    await delay(10 * 60 * 60 * 1000);
                }
                if (windowToTabTabGroupID === null) {
                    console.warn(`**** Window to tab not tabbed following tabWindowsformerTogether (${windowToTab.identity.uuid}/${windowToTab.identity.name})`);
        
                    console.trace();
                    console.warn(`**************************`);
                    await delay(10 * 60 * 60 * 1000);
                }
            }
        }
    }
}