import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {executeJavascriptOnService} from '../../demo/utils/serviceUtils';
import {getTabGroupID, getTabGroupIdentity} from '../../demo/utils/tabServiceUtils';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';

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

        if (targetTabGroupID === null || windowToTabTabGroupID == null || (targetTabGroupID !== windowToTabTabGroupID)) {
            console.warn(`Windows not tabbed following tabWindowsTogether. Target window: ${target.identity.uuid}/${target.identity.name}, ${
                targetTabGroupID}. Window to tab: ${windowToTab.identity.uuid}/${windowToTab.identity.name}, ${windowToTabTabGroupID}`);
        }
    }
}