import {getBounds} from './getBounds';
import {Win} from './getWindow';
import {Side} from './SideUtils';

export async function getDistanceBetween(win1: Win, side1: Side, win2: Win, side2: Side): Promise<number> {
    const bounds = [await getBounds(win1), await getBounds(win2)];

    return Math.abs(bounds[0][side1] - bounds[1][side2]);
}
