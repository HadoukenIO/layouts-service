import * as robot from 'robotjs';
import { getBounds } from './getBounds';
import { Win, getWindow } from './getWindow';
const xOffset = 30;
const yOffset = 10;

export const dragWindowAndHover = async (identityOrWindow: Win, x: number, y: number) => {
    // Focus the window to make sure it's on top.
    const win = await getWindow(identityOrWindow);
    await win.focus();

<<<<<<< HEAD:test/utils/dragWindowAndHover.ts
    const bounds = await getBounds(identityOrWindow);
=======
    const bounds = await getBounds(win);
>>>>>>> develop:test/provider/utils/dragWindowAndHover.ts
    robot.mouseToggle('up');
    robot.moveMouse(bounds.left + xOffset, bounds.top + yOffset);
    robot.mouseToggle('down');
    robot.moveMouseSmooth(x + xOffset, y + yOffset);
};
