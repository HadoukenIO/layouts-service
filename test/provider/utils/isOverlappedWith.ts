import { Window, Fin } from 'hadouken-js-adapter';
import { getBounds } from './getBounds';

export async function isOverlappedWith(win1: Window, win2: Window) {
    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    bounds1.right = bounds1.right || bounds1.left + bounds1.width;
    bounds1.bottom = bounds1.bottom || bounds1.top + bounds1.height;

    bounds2.right = bounds2.right || bounds2.left + bounds2.width;
    bounds2.bottom = bounds2.bottom || bounds2.top + bounds2.height;

    return !(bounds2.left > bounds1.right ||
        bounds2.right < bounds1.left ||
        bounds2.top > bounds1.bottom ||
        bounds2.bottom < bounds1.top);
}