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

	public resizeTo(width: number, height: number, anchor: fin.OpenFinAnchor) {
		return new Promise((res, rej) => {
			this._window.resizeTo(width, height, anchor, res, rej);
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

	public close(force: boolean): Promise<void> {
		return new Promise((res, rej) => {
			this._window.close(force, res, rej);
		});
	}

	public getState(): Promise<string> {
		return new Promise((res, rej) => {
			this._window.getState(res, rej);
		});
	}

	public moveTo(left: number, top: number) {
		return new Promise((res, rej) => {
			this._window.moveTo(left, top, res, rej);
		});
	}

	public leaveGroup() {
		return new Promise((res, rej) => {
			this._window.leaveGroup(res, res);
		});
	}

	protected _createWindowEventListeners() {
		//
	}

	public get finWindow() {
		return this._window;
	}
}
