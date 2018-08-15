/**
 * Contains promisified Openfin window functionality.
 */
export class AsyncWindow {
    /**
     * @protected
     * @description An openfin window
     */
    protected _window!: fin.OpenFinWindow;

    /**
     * Gets the Openfin window bounds.
     * @returns {Promise<fin.WindowBounds>} A promise with the WindowBounds
     */
    public getWindowBounds(): Promise<fin.WindowBounds> {
        return new Promise((res, rej) => {
            this._window.getBounds(res, rej);
        });
    }

    /**
     * Resizes the window.
     * @param {number} width New Window Width
     * @param {number} height New Window Height
     * @param {fin.OpenFinAnchor} anchor The Openfin Anchor Position ("top-left", etc...)
     */
    public resizeTo(width: number, height: number, anchor: fin.OpenFinAnchor): Promise<void> {
        return new Promise((res, rej) => {
            this._window.resizeTo(width, height, anchor, res, rej);
        });
    }

    /**
     * Updates the Openfin Window Options
     * @param {fin.WindowOptions} options The Openfin Window Options to update.
     */
    public updateWindowOptions(options: fin.WindowOptions): Promise<void> {
        return new Promise((res, rej) => {
            this._window.updateOptions(options, res, rej);
        });
    }

    /**
     * Returns the window options for the current window
     * @returns {Promise<fin.WindowOptions>} A promsie with WindowOptions result
     */
    public getWindowOptions(): Promise<fin.WindowOptions> {
        return new Promise((res, rej) => {
            this._window.getOptions(res, rej);
        });
    }

    /**
     * Closes the Openfin Window.
     * @param force Force close the window in case the window has a show-requested listener.
     */
    public close(force: boolean): Promise<void> {
        return new Promise((res, rej) => {
            this._window.close(force, res, rej);
        });
    }

    /**
     * Returns the Openfin window state.
     * @returns {Promise<string>}
     */
    public getState(): Promise<string> {
        return new Promise((res, rej) => {
            this._window.getState(res, rej);
        });
    }

    /**
     * Moves the window to a new position.
     * @param {number} left X Coordinate to Move to.
     * @param {number} top Y Coordinate to Move to.
     */
    public moveTo(left: number, top: number): Promise<void> {
        return new Promise((res, rej) => {
            this._window.moveTo(left, top, res, rej);
        });
    }

    /**
     * Leaves the windows current group.
     */
    public leaveGroup(): Promise<void> {
        return new Promise((res, rej) => {
            this._window.leaveGroup(res, rej);
        });
    }

    public restore(): Promise<void> {
        return new Promise((res, rej) => {
            this._window.restore(res, rej);
        });
    }

    public minimize(): Promise<void> {
        return new Promise((res, rej) => {
            this._window.minimize(res, rej);
        });
    }

    /**
     * Returns the Openfin Window
     */
    public get finWindow(): fin.OpenFinWindow {
        return this._window;
    }
}
