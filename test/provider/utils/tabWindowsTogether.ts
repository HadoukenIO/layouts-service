import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';
import {isInGroup} from './isInGroup';

export async function tabWindowsTogether(target: _Window, windowToTab: _Window) {
    const group = await target.getGroup();
    const startingInGroup: boolean = await isInGroup(target) && group.findIndex((win) => {
        return win.identity.name!.includes('TABSET-');
    }) >= 0;

    await dragWindowToOtherWindow(windowToTab, 'top-left', target, 'top-left', {x: 10, y: startingInGroup ? -20 : 10});
    await delay(500);
}