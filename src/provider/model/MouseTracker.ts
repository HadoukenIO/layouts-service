import { PointTopLeft } from "hadouken-js-adapter/out/types/src/api/system/point";
import { DesktopWindow, WindowState } from "./DesktopWindow";

export class MouseTracker {
    private window: DesktopWindow | null = null;
    private mouseOffset: PointTopLeft | null = null;

    /**
     * Initializes the mouse tracking process relative to a window.
     * @param {DesktopWindow} window The window to use as a reference point for calculations.  Typically the window being dragged.
     */
    public async start(window: DesktopWindow){
        const mousePosition: PointTopLeft = await fin.System.getMousePosition();
        const windowState: WindowState = window.getState();

        this.window = window;
        this.mouseOffset = {left: mousePosition.left - (windowState.center.x - windowState.halfSize.x), top: mousePosition.top - (windowState.center.y - windowState.halfSize.y)};
    }

    /**
     * Returns the mouse position on screen when a window is being moved. If no window is being moved then we return null.
     * @returns {PointTopLeft | null} Mouse Position or null.
     */
    public getPos(): PointTopLeft | null {
        if(this.window && this.mouseOffset){
            const currentWindowState: WindowState = this.window.getState();

            return {left: this.mouseOffset.left + (currentWindowState.center.x - currentWindowState.halfSize.x), top: this.mouseOffset.top + (currentWindowState.center.y - currentWindowState.halfSize.y)}
        }

        return null;
    }

    /**
     * Ends the mouse tracking process.
     */
    public end() {
        this.window = this.mouseOffset = null;
    }
}