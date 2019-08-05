import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';

export function haveMonitorsBeenDetached(oldMonitors: ReadonlyArray<Rectangle>, newMonitors: ReadonlyArray<Rectangle>): boolean {
    return !oldMonitors.every(oldMonitor => newMonitors.some(newMonitor => RectUtils.isEqual(oldMonitor, newMonitor)));
}
