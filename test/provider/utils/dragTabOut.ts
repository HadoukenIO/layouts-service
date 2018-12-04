import * as robot from 'robotjs';
import {delay} from './delay';
import {getBounds} from './getBounds';
import {getWindow, Win} from './getWindow';
const xOffset = 30;
const yOffset = 30;

export async function dragTabOut(identityOrWindow: Win, x: number, y: number) {
    // Focus the window to make sure it's on top.
    const win = await getWindow(identityOrWindow);
    await win.focus();

    const bounds = await getBounds(identityOrWindow);
    robot.mouseToggle('up');
    robot.moveMouse(bounds.left + xOffset, bounds.top - yOffset);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(x + xOffset, y + yOffset);
    robot.mouseToggle('up');

    await delay(500);
}
