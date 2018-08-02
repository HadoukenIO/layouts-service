import * as robot from 'robotjs';
import { getBounds } from './getBounds';
import { Win } from './getWindow';
const xOffset = 30;
const yOffset = 10;

export const dragWindowAndHover = async (identityOrWindow: Win, x: number, y: number) => {
    const bounds = await getBounds(identityOrWindow);
    robot.mouseToggle('up');
    robot.moveMouse(bounds.left + xOffset, bounds.top + yOffset);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(x + xOffset, y + yOffset);
};
