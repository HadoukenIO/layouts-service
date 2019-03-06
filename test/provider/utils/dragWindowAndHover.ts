import * as robot from 'robotjs';
import {delay} from './delay';
import {getBounds} from './getBounds';
import {getWindow, Win} from './getWindow';
const xOffset = 30;
const yOffset = 10;

export const dragWindowAndHover = async (identityOrWindow: Win, x: number, y: number) => {
    // Focus the window to make sure it's on top.
    const win = await getWindow(identityOrWindow);
    await win.focus();

    const bounds = await getBounds(identityOrWindow);
    robot.mouseToggle('up');
    robot.moveMouse(bounds.left + xOffset, bounds.top + yOffset);
    robot.mouseToggle('down');

    if (x === bounds.left && y === bounds.top) {
        robot.moveMouseSmooth(x + xOffset + 3, y + yOffset + 3);

        console.warn('*** drag involves no movement, so jiggling');
    }

    robot.moveMouseSmooth(x + xOffset, y + yOffset);

    await delay(500);
};
