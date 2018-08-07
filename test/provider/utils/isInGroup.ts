import { Window } from 'hadouken-js-adapter';

export async function isInGroup(win: Window) {
    return (await win.getGroup()).length > 0;
}