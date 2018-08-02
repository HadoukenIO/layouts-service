import { TabIndentifier } from "../../shared/types";

interface ZIndex {
	timestamp: number;
	ID: TabIndentifier;
}

export class ZIndexer {
	public static INSTANCE: ZIndexer;
	private _stack: ZIndex[] = [];

	constructor() {
		if (ZIndexer.INSTANCE) {
			return ZIndexer.INSTANCE;
		}

		fin.desktop.Application.getCurrent().addEventListener("window-created", win => {
			// @ts-ignore
			const w = fin.desktop.Window.wrap(fin.desktop.Application.getCurrent().uuid, win.name);
			this._addEventListeners(w);
		});

		fin.desktop.System.addEventListener("application-started", ev => {
			// @ts-ignore
			const app = fin.desktop.Application.wrap(ev.uuid);
			const appWin = app.getWindow();

			this._addEventListeners(appWin);

			app.addEventListener("window-created", win => {
				// @ts-ignore
				const w = fin.desktop.Window.wrap(app.uuid, win.name);
				this._addEventListeners(w);
			});
		});

		ZIndexer.INSTANCE = this;
	}

	public update(ID: TabIndentifier) {
		const time = new Date().valueOf();

		const index = this._stack.find(i => {
			return ID.uuid === i.ID.uuid && ID.name === i.ID.name;
		});

		if (index) {
			index.timestamp = time;
		} else {
			this._stack.push({ ID, timestamp: time });
		}

		this._stack.sort((a, b) => {
			return b.timestamp - a.timestamp;
		});
	}

	public getTop(ids: TabIndentifier[]): TabIndentifier[] | null {
		const resArray: TabIndentifier[] = [];
		this._stack.forEach(idx => {
			const result = ids.find(idsidx => {
				return idx.ID.uuid === idsidx.uuid && idx.ID.name === idsidx.name;
			});

			if (result) resArray.push(result);
		});

		return resArray.length > 0 ? resArray : null;
	}

	private _addEventListeners(win: fin.OpenFinWindow) {
		win.addEventListener("focused", () => {
			// @ts-ignore
			this.update({ uuid: win.uuid, name: win.name });
		});

		win.addEventListener("shown", () => {
			// @ts-ignore
			this.update({ uuid: win.uuid, name: win.name });
		});

		win.addEventListener("bounds-changed", () => {
			// @ts-ignore
			this.update({ uuid: win.uuid, name: win.name });
		});
	}

	public get indexes() {
		return this._stack;
	}
}
