import * as robot from 'robotjs';
import { getBounds } from './getBounds';
import { Win } from './getWindow';
import { dragWindowAndHover } from './dragWindowAndHover';
import { Point } from '../../node_modules/hadouken-js-adapter/out/types/src/api/system/point';

enum SideEnum {
    'top',
    'bottom',
    'left',
    'right'
}

export type Side = keyof typeof SideEnum;

export async function getDistanceBetween(win1: Win, side1: Side, win2:Win, side2: Side):Promise<number> {
    const bounds = [await getBounds(win1),await getBounds(win2)];

    return Math.abs(bounds[0][side1] - bounds[1][side2]);
}