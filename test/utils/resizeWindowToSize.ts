import * as robot from 'robotjs';
import { getBounds } from './getBounds';
import { Win } from './getWindow';
const xOffset = 5;
const yOffset = 10;

export const resizeWindowToSize = async (identityOrWindow: Win, width: number, height: number) => {
    const bounds = await getBounds(identityOrWindow);
    const currentWidth = bounds.right - bounds.left;
    const currentHeight = bounds.bottom - bounds.top;
    robot.moveMouse(bounds.left + currentWidth*0.5, bounds.bottom - 1);
    robot.mouseToggle('down');
    robot.moveMouse(bounds.left + currentWidth*0.5, bounds.bottom - 1 + (height - currentHeight));
    robot.mouseToggle('up');
    robot.moveMouse(bounds.right - 1, bounds.top + 20);
    robot.mouseToggle('down');
    robot.moveMouse(bounds.right - 1 + (width - currentWidth), bounds.top + 20);
    robot.mouseToggle('up');
    await new Promise((r) => setTimeout(r, 1000));
};
