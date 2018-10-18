import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {delay} from './delay';
import {dragWindowToOtherWindow} from './dragWindowTo';
import {isInGroup} from './isInGroup';

async function asyncForEach<T>(array: T[], callback: (value: T, index: number, array: T[]) => void) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

export async function tabWindowsTogether(target: _Window, windowsToTab: _Window[]) {
    const group = await target.getGroup();
    let startingInGroup: boolean|_Window|undefined = await isInGroup(target) && group.find((win) => {
        return win.identity.name!.includes('TABSET-');
    });

    // return await Promise.all(windowsToTab.map((win) => {
    //         return dragWindowToOtherWindow(win, 'top-left', target, 'top-left', {x: 10, y: startingInGroup ? -20 : 20});
    // }));

    return await asyncForEach(windowsToTab, async (win: _Window, i: number) => {
        await dragWindowToOtherWindow(win, 'top-left', target, 'top-left', {x: 10, y: startingInGroup ? -20 : 20});
        await delay(500);

        if (i === 0) {
            startingInGroup = true;
        }
    });
}