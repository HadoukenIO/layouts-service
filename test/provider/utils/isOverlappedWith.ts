import {Fin, Window} from 'hadouken-js-adapter';

import {getBounds} from './bounds';

export async function isOverlappedWith(win1: Window, win2: Window) {
    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    return !(bounds2.left >= bounds1.right || bounds2.right <= bounds1.left || bounds2.top >= bounds1.bottom || bounds2.bottom <= bounds1.top);
}
