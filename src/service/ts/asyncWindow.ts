export class AsyncWindow {
	protected _window!: fin.OpenFinWindow;

	public getWindowBounds(): Promise<fin.WindowBounds> {
		return new Promise((res, rej) => {
			if (this._window) {
				this._window.getBounds(res, rej);
			} else {
				rej();
			}
		});
	}

	public updateWindowOptions(options: fin.WindowOptions): Promise<void> {
		return new Promise((res, rej) => {
			this._window.updateOptions(options, res, rej);
		});
	}

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

	public get finWindow() {
		return this._window;
	}
}
