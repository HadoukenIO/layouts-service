import {TabIdentifier} from '../../client/types';

export interface ZIndex {
    timestamp: number;
    ID: TabIdentifier;
}

/**
 * Keeps track of window Z-indexes.  Currently a POC!
 */
export class ZIndexer {
    /**
     * Handle to this instance.
     */
    public static INSTANCE: ZIndexer;

    /**
     * The array of z-indexes of windows + IDs
     */
    private _stack: ZIndex[] = [];

    /**
     * Constructor of the ZIndexer class.
     */
    constructor() {
        if (ZIndexer.INSTANCE) {
            return ZIndexer.INSTANCE;
        }

        fin.desktop.Application.getCurrent().addEventListener('window-created', (win: fin.WindowEvent) => {
            const w = fin.desktop.Window.wrap(fin.desktop.Application.getCurrent().uuid, win.name);
            this._addEventListeners(w);
        });

        fin.desktop.System.addEventListener('application-started', (ev: fin.SystemBaseEvent) => {
            const app = fin.desktop.Application.wrap(ev.uuid);
            const appWin = app.getWindow();

            this._addEventListeners(appWin);

            app.addEventListener('window-created', (win: fin.WindowEvent) => {
                const w = fin.desktop.Window.wrap(app.uuid, win.name);
                this._addEventListeners(w);
            });
        });

        // Register all existing applications
        fin.desktop.System.getAllApplications(apps => {
            apps.forEach(appID => {
                const app = fin.desktop.Application.wrap(appID.uuid);

                // Listen for any new child windows
                app.addEventListener('window-created', (win: {name: string}) => {
                    const w = fin.desktop.Window.wrap(app.uuid, win.name);
                    this._addEventListeners(w);
                });

                // Register main window
                this._addEventListeners(app.getWindow());

                // Register existing child windows
                app.getChildWindows(children => {
                    children.forEach(w => {
                        this._addEventListeners(w);
                    });
                });
            });
        });

        ZIndexer.INSTANCE = this;
    }

    /**
     * Updates the windows index in the stack and sorts array.
     * @param ID ID of the window to update (uuid, name)
     */
    public update(ID: TabIdentifier) {
        const time = new Date().valueOf();

        const index = this._stack.find(i => {
            return ID.uuid === i.ID.uuid && ID.name === i.ID.name;
        });

        if (index) {
            index.timestamp = time;
        } else {
            this._stack.push({ID, timestamp: time});
        }

        this._stack.sort((a, b) => {
            return b.timestamp - a.timestamp;
        });
    }

    /**
     * Returns order of zindexs for a set of window IDs.  Order is from top to bottom.
     * @param {TabIdentifier[]} ids Array of IDs to get order of.
     * @return {TabIdentifier[] | null} Array of TabIdentifiers or null
     */
    public getTop(ids: TabIdentifier[]): TabIdentifier[]|null {
        const resArray: TabIdentifier[] = [];
        this._stack.forEach(idx => {
            const result = ids.find(idsidx => {
                return idx.ID.uuid === idsidx.uuid && idx.ID.name === idsidx.name;
            });

            if (result) resArray.push(result);
        });

        return resArray.length > 0 ? resArray : null;
    }

    /**
     * Creates window event listeners on a specified window.
     * @param win Window to add the event listeners to.
     */
    private _addEventListeners(win: fin.OpenFinWindow) {
        win.addEventListener('focused', () => {
            this.update({uuid: win.uuid, name: win.name});
        });

        win.addEventListener('shown', () => {
            this.update({uuid: win.uuid, name: win.name});
        });

        win.addEventListener('bounds-changed', () => {
            this.update({uuid: win.uuid, name: win.name});
        });
    }

    /**
     * Returns the array of indexes.
     * @returns {ZIndex[]} ZIndex[]
     */
    public get indexes(): ZIndex[] {
        return this._stack;
    }
}
