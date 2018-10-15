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
        // If side isn't specified, we check all sides
        for (const side of sideArray) {
            if (await getDistanceBetween(win1, side, win2, opposite(side)) === 0) {
                // When we find a side that's adjacent, immediately return and skip any remaining sides
                return true;
            }
        }

        // If we made it past the for loop, then the windows are not adjacent on any side
        return false;
    }
}