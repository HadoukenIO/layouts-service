/// <reference types="openfin" />
/**
 * Contains promisified Openfin window functionality.
 */
export declare class AsyncWindow {
    /**
     * @protected
     * @description An openfin window
     */
    protected _window: fin.OpenFinWindow;
    /**
     * Gets the Openfin window bounds.
     * @returns {Promise<fin.WindowBounds>} A promise with the WindowBounds
     */
    getWindowBounds(): Promise<fin.WindowBounds>;
    /**
     * Resizes the window.
     * @param {number} width New Window Width
     * @param {number} height New Window Height
     * @param {fin.OpenFinAnchor} anchor The Openfin Anchor Position ("top-left", etc...)
     */
    resizeTo(width: number, height: number, anchor: fin.OpenFinAnchor): Promise<void>;
    /**
     * Updates the Openfin Window Options
     * @param {fin.WindowOptions} options The Openfin Window Options to update.
     */
    updateWindowOptions(options: fin.WindowOptions): Promise<void>;
    /**
     * Returns the window options for the current window
     * @returns {Promise<fin.WindowOptions>} A promsie with WindowOptions result
     */
    getWindowOptions(): Promise<fin.WindowOptions>;
    /**
     * Closes the Openfin Window.
     * @param force Force close the window in case the window has a show-requested listener.
     */
    close(force: boolean): Promise<void>;
    /**
     * Returns the Openfin window state.
     * @returns {Promise<string>}
     */
    getState(): Promise<string>;
    /**
     * Moves the window to a new position.
     * @param {number} left X Coordinate to Move to.
     * @param {number} top Y Coordinate to Move to.
     */
    moveTo(left: number, top: number): Promise<void>;
    /**
     * Leaves the windows current group.
     */
    leaveGroup(): Promise<void>;
    restore(): Promise<void>;
    minimize(): Promise<void>;
    /**
     * Returns the Openfin Window
     */
    readonly finWindow: fin.OpenFinWindow;
}
