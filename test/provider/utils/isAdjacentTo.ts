import {getBounds} from './bounds';
import {getDistanceBetween} from './getDistanceBetween';
import {Win} from './getWindow';
import {opposite, Side, sideArray} from './SideUtils';

/**
 * Checks whether two windows are adjacent
 * @param win1 First window
 * @param win2 Second window
 * @param side [Optional] Side to check (with respect to win1). If not specified, will check all sides.
 */
export async function isAdjacentTo(win1: Win, win2: Win, side?: Side): Promise<boolean> {
    if (side) {
        const distance = await getDistanceBetween(win1, side, win2, opposite(side));
        return distance === 0;
    } else {
        const [bounds1, bounds2] = [await getBounds(win1), await getBounds(win2)];
        return (
            Math.abs((bounds1.left + bounds1.width / 2) - (bounds2.left + bounds2.width / 2)) - (bounds1.width + bounds2.width) / 2 === 0 ||
            Math.abs((bounds1.top + bounds1.height / 2) - (bounds2.top + bounds2.height / 2)) - (bounds1.height + bounds2.height) / 2 === 0);
    }
}
