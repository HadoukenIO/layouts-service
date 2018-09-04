import * as robot from 'robotjs';
import { getBounds } from './getBounds';
import { Window } from 'hadouken-js-adapter';

export const resizeWindowToSize = async (identityOrWindow: Window, width: number, height: number) => {
    const bounds = await getBounds(identityOrWindow);
    return identityOrWindow.setBounds({left:bounds.left, top: bounds.top, width: width, height: height});
};
