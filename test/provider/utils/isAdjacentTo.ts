import {getDistanceBetween} from './getDistanceBetween';
import {Win} from './getWindow';
import {opposite, Side} from './SideUtils';

export async function isAdjacentTo(win1: Win, win2: Win, side: Side): Promise<boolean> {
    const distance = await getDistanceBetween(win1, side, win2, opposite(side));
    return distance === 0;
}