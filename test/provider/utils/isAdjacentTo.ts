import { Win } from './getWindow';
import { getDistanceBetween } from './getDistanceBetween';
import { opposite } from './SideUtils';


enum SideEnum {
    'top',
    'bottom',
    'left',
    'right'
}

export type Side = keyof typeof SideEnum;

export async function isAdjacentTo(win1: Win, win2:Win, side: Side):Promise<boolean> {
    const distance = await getDistanceBetween(win1, side, win2, opposite(side));
    return distance === 0;
}