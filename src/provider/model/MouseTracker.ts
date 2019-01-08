import {Point, PointTopLeft} from 'hadouken-js-adapter/out/types/src/api/system/point';
import {DragWindowManager} from '../tabbing/DragWindowManager';
import {DesktopWindow, EntityState, eTransformType, Mask, WindowState} from './DesktopWindow';

/**
 * A helper to keep track of mouse position when a window is being dragged via user movement
 */
export class MouseTracker {
    /**
     * Window being tracked / moved
     */
    private _window: DesktopWindow|null = null;
    /**
     * The mouse offset relative to the top-left corner of the window
     */
    private _mouseOffset: Point|null = null;

    private knownPosition: Point|null = null;

    constructor() {
        DesktopWindow.onCreated.add(this.onDesktopWindowCreated, this);
        DesktopWindow.onDestroyed.add(this.onDesktopWindowDestroyed, this);
        DragWindowManager.onDragOver.add(this.onTabDrag, this);
        DragWindowManager.onDragDrop.add(this.onTabDrop, this);
    }

    /**
     * Returns the mouse position on screen when a window is being moved. If no window is being moved then we return null.
     * @returns {Point | null} Mouse Position or null.
     */
    public getPosition(): Point|null {
        if (this._window && this._mouseOffset) {
            const currentWindowState: EntityState = this._window.currentState;

            return {
                x: this._mouseOffset.x + (currentWindowState.center.x - currentWindowState.halfSize.x),
                y: this._mouseOffset.y + (currentWindowState.center.y - currentWindowState.halfSize.y)
            };
        }

        return null;
    }

    private onDesktopWindowCreated(window: DesktopWindow) {
        window.onTransform.add(this.start, this);
    }

    private onDesktopWindowDestroyed(window: DesktopWindow) {
        window.onTransform.remove(this.start, this);
        window.onCommit.remove(this.end, this);
    }

    private onTabDrag(window: DesktopWindow, position: Point) {
        this.knownPosition = position;
    }

    private onTabDrop() {
        // Timeout because the position will be cleared once a tab drop has occurred.  In the event of an tab eject this information is needed at drop.
        setTimeout(() => {
            this.knownPosition = null;
        }, 500);
    }

    /**
     * Initializes the mouse tracking process relative to a window.
     * @param {DesktopWindow} window The window to use as a reference point for calculations.  Typically the window being dragged.
     */
    private async start(window: DesktopWindow, type: Mask<eTransformType>) {
        if (this._window === window) {
            // Already initialised
            return;
        } else if (this._window) {
            // Being re-initialised with another window
            console.warn('Switching mouse tracker from', this._window.id, 'to', window && window.id);
            this.end(window, type);
        }

        // Must do all initialisation of the mouse tracker synchronously.
        this._window = window;
        if (!window.onCommit.has(this.end, this)) {
            window.onCommit.add(this.end, this);
        }

        // Asynchronously get the mouse position and offset
        const mousePosition: PointTopLeft = await fin.System.getMousePosition();
        if (this._window === window) {
            const state: EntityState = window.currentState;

            this._mouseOffset = {x: mousePosition.left - (state.center.x - state.halfSize.x), y: mousePosition.top - (state.center.y - state.halfSize.y)};
        }
    }

    /**
     * Ends the mouse tracking process.
     */
    private end(window: DesktopWindow, type: Mask<eTransformType>) {
        if (this._window) {
            this._window.onCommit.remove(this.end, this);
            this._window = this._mouseOffset = null;
        }
    }

    /**
     * Returns the mouse position on screen when a window is being moved. If no window is being moved then we return null.
     * @returns {Point | null} Mouse Position or null.
     */
    public getPosition(): Point|null {
        if (this.window && this.mouseOffset) {
            const currentWindowState: WindowState = this.window.getState();

            return {
                x: this.mouseOffset.x + (currentWindowState.center.x - currentWindowState.halfSize.x),
                y: this.mouseOffset.y + (currentWindowState.center.y - currentWindowState.halfSize.y)
            };
        } else if (this.knownPosition) {
            return this.knownPosition;
        }

        return null;
    }

}
