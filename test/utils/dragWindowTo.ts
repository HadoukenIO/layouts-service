import * as robot from 'robotjs';
import { getBounds } from './getBounds';
import { Win } from './getWindow';
import { dragWindowAndHover } from './dragWindowAndHover';

export const dragWindowTo = async (identityOrWindow: Win, x: number, y: number) => {
    await dragWindowAndHover(identityOrWindow, x, y);
    robot.mouseToggle('up');
    await new Promise((r) => setTimeout(r, 2000));
};
