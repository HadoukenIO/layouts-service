/**
 * @class Base class for all window objects
 */
export class AsyncWindow {

    /**
     * @protected
     * @description An openfin window
     */
	protected _window!: fin.OpenFinWindow;

    /**
     * @public
     * @function getWindowBounds Gets the openfin window bounds
     */
	public getWindowBounds(): Promise<fin.WindowBounds> {
		return new Promise((res, rej) => {
			if (this._window) {
				this._window.getBounds(res, rej);
			} else {
				rej();
			}
		});
	}

    /**
     * @function updateWindowOptions Updates the window options for the openfin window
     * @param options The new options
     */
	public updateWindowOptions(options: fin.WindowOptions): Promise<void> {
		return new Promise((res, rej) => {
			this._window.updateOptions(options, res, rej);
		});
	}

    /**
     * @public
     * @function getWindowOptions Returns the window options for the current window
     * @returns {Promise<fin.WindowOptions>} A promsie with WindowOptions result
     */
	public getWindowOptions(): Promise<fin.WindowOptions> {
		return new Promise((res, rej) => {
			if (this._window) {
				this._window.getOptions(res, rej);
			} else {
				rej();
			}
		});
	}

    /**
     * @public
     * @function close Closes the openfin window
     * @param force Boolean flag to force close the window
     */
	public close(force: boolean): Promise<void> {
		return new Promise((res, rej) => {
			this._window.close(force, res, rej);
		});
	}


	public get finWindow() {
		return this._window;
	}
}
