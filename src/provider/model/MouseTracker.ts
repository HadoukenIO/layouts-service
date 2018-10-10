import {PointTopLeft} from 'hadouken-js-adapter/out/types/src/api/system/point';

import {DesktopWindow, eTransformType, Mask, WindowState} from './DesktopWindow';

export class MouseTracker {
    private window: DesktopWindow|null = null;
    private mouseOffset: PointTopLeft|null = null;

    constructor() {
        DesktopWindow.onCreated.add(this.onDesktopWindowCreated, this);
        DesktopWindow.onDestroyed.add(this.onDesktopWindowDestroyed, this);
    }

    private onDesktopWindowCreated(window: DesktopWindow) {
        window.onTransform.add(this.start, this);
        window.onCommit.add(this.end, this);
    }

    private onDesktopWindowDestroyed(window: DesktopWindow) {
        window.onTransform.remove(this.start, this);
        window.onCommit.remove(this.end, this);
    }

    /**
     * Initializes the mouse tracking process relative to a window.
     * @param {DesktopWindow} window The window to use as a reference point for calculations.  Typically the window being dragged.
     */
    private async start(window: DesktopWindow, type: Mask<eTransformType>) {
        const mousePosition: PointTopLeft = await fin.System.getMousePosition();
        const windowState: WindowState = window.getState();

        this.window = window;
        this.mouseOffset = {
            left: mousePosition.left - (windowState.center.x - windowState.halfSize.x),
            top: mousePosition.top - (windowState.center.y - windowState.halfSize.y)
        };
    }

    /**
     * Ends the mouse tracking process.
     */
    private end(window: DesktopWindow, type: Mask<eTransformType>) {
        if (this.window) {
            this.window.onCommit.remove(this.end, this);
            this.window = this.mouseOffset = null;
        }
    }

    /**
     * Returns the mouse position on screen when a window is being moved. If no window is being moved then we return null.
     * @returns {PointTopLeft | null} Mouse Position or null.
     */
    public getPos(): PointTopLeft|null {
        if (this.window && this.mouseOffset) {
            const currentWindowState: WindowState = this.window.getState();

            return {
                left: this.mouseOffset.left + (currentWindowState.center.x - currentWindowState.halfSize.x),
                top: this.mouseOffset.top + (currentWindowState.center.y - currentWindowState.halfSize.y)
            };
        }

        return null;
    }
}