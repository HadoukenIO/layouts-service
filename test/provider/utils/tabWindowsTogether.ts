import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {getTabGroupID, getTabGroupIdentity} from '../../demo/utils/tabServiceUtils';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';

export async function tabWindowsTogether(target: _Window, windowToTab: _Window) {
    const isTargetTabbed: boolean = await getTabGroupIdentity(target.identity) !== null;

    await dragWindowToOtherWindow(windowToTab, 'top-left', target, 'top-left', {x: 10, y: isTargetTabbed ? -20 : 10});
    await delay(500);

    const targetTabGroupID = await getTabGroupID(target.identity);
    if (targetTabGroupID === null) {
        console.warn(`Target window not tabbed following tabWindowsTogether (${target.identity.uuid}/${target.identity.name})`);
    }
    const windowToTabTabGroupID = await getTabGroupID(windowToTab.identity);
    if (windowToTabTabGroupID === null) {
        console.warn(`Window to tab not tabbed following tabWindowsTogether (${windowToTab.identity.uuid}/${windowToTab.identity.name})`);
    }
}