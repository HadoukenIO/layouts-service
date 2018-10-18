import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';
import {isInGroup} from './isInGroup';

export async function tabWindowsTogether(target: _Window, windowToTab: _Window) {
    const group = await target.getGroup();
    let startingInGroup: boolean|_Window|undefined = await isInGroup(target) && group.find((win) => {
        return win.identity.name!.includes('TABSET-');
    });

    await dragWindowToOtherWindow(windowToTab, 'top-left', target, 'top-left', {x: 10, y: startingInGroup ? -20 : 20});
    await delay(500);
}