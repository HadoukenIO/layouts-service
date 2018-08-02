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

export async function isAdjacentTo(win1: Win, win2:Win, side: Side):Promise<boolean> {
    return true;
}