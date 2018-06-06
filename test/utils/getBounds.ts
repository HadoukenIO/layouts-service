import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import * as os from 'os';

import {getWindow, Win} from './getWindow';

const isWin10 = os.type() === 'Windows_NT' && os.release().slice(0, 2) === '10';

export interface NormalizedBounds extends Bounds {
  bottom: number;
  right: number;
}

export const getBounds =
    async(identityOrWindow: Win): Promise<NormalizedBounds> => {
  const win = await getWindow(identityOrWindow);
  const bounds = await win.getBounds();
  bounds.right = bounds.right || bounds.left + bounds.width;
  bounds.bottom = bounds.bottom || bounds.top + bounds.height;
  if (!isWin10) {
    return bounds as NormalizedBounds;
  }
  const options = await win.getOptions();
  if (!options.frame) {
    return bounds as NormalizedBounds;
  }
  return Object.assign(bounds, {
    left: bounds.left + 7,
    right: bounds.right - 7,
    bottom: bounds.bottom - 7
  });
};
