import {TabIdentifier} from '../../client/types';
import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopWindow} from './DesktopWindow';

export interface ZIndex {
    timestamp: number;
    id: string;
    identity: TabIdentifier;
}

interface ObjectWithIdentity {
    getIdentity(): TabIdentifier;
}

/**
 * Keeps track of window Z-indexes
 */
export class ZIndexer {
    private _model: DesktopModel;

    /**
     * The array of z-indexes of windows + IDs
     */
    private _stack: ZIndex[] = [];

    /**
     * Constructor of the ZIndexer class.
     */
    constructor(model: DesktopModel) {
        this._model = model;

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
    }

    /**
     * Returns the array of indexes.
     * @returns {ZIndex[]} ZIndex[]
     */
    public get indexes(): ReadonlyArray<ZIndex> {
        return this._stack;
    }

    /**
     * Updates the windows index in the stack and sorts array.
     * @param identity ID of the window to update (uuid, name)
     */
    public update(identity: TabIdentifier) {
        const id: string = this._model.getId(identity);
        const entry: ZIndex|undefined = this._stack.find(i => i.id === id);
        const time = Date.now();

        if (entry) {
            entry.timestamp = time;
        } else {
            this._stack.push({id, identity, timestamp: time});
        }

        this._stack.sort((a, b) => {
            return b.timestamp - a.timestamp;
        });
    }

    /**
     * Takes a list of window-like items and returns the top-most item from the list.
     *
     * NOTE: Implementation will not return any item within the input that does not exist within the ZIndexer util.
     *
     * @param items Array of window or identity objects
     * @return The top-most of the input items, when sorted by z-index
     */
    public getTopMost<T extends(TabIdentifier|ObjectWithIdentity)>(items: T[]): T|null {
        const ids: string[] = this.getIds(items);

        for (const item of this._stack) {
            const index: number = ids.indexOf(item.id);
            if (index >= 0) {
                return items[index];
            }
        }

        return null;
    }

    /**
     * Takes a list of window-like items, and sorts them by the z-index of their respective windows.
     *
     * NOTE: Implementation will filter-out any windows within the input that do not exist within the ZIndexer util.
     *
     * @param items
     */
    public sort<T extends(TabIdentifier|ObjectWithIdentity)>(items: T[]): T[] {
        const ids: string[] = this.getIds(items);
        const result: T[] = [];

        for (const item of this._stack) {
            const index: number = ids.indexOf(item.id);
            if (index >= 0) {
                result.push(items[index]);
            }
        }

        return result;
    }

    /**
     * Creates window event listeners on a specified window.
     * @param win Window to add the event listeners to.
     */
    private _addEventListeners(win: fin.OpenFinWindow) {
        const bringToFront = () => {
            const modelWindow: DesktopWindow|null = this._model.getWindow(win);
            const modelGroup: DesktopSnapGroup|null = modelWindow && modelWindow.getSnapGroup();

            if (modelGroup && modelGroup.length > 1) {
                // Also bring-to-front any windows within the group
                modelGroup.windows.forEach(window => this.update(window.getIdentity()));
            } else {
                // Just bring modified window to front
                this.update({uuid: win.uuid, name: win.name});
            }
        };
        const onClose = () => {
            win.removeEventListener('focused', bringToFront);
            win.removeEventListener('shown', bringToFront);
            win.removeEventListener('bounds-changed', bringToFront);
            win.removeEventListener('closed', onClose);
        };

        // When a window is brought to the front of the stack, update the z-index of the window and any grouped windows
        win.addEventListener('focused', bringToFront);
        win.addEventListener('shown', bringToFront);
        win.addEventListener('bounds-changed', bringToFront);

        // Remove listeners when the window is destroyed
        win.addEventListener('closed', onClose);
    }

    private getIds<T extends(TabIdentifier|ObjectWithIdentity)>(items: T[]): string[] {
        return items.map((item: T) => {
            if (this.hasIdentity(item)) {
                return this._model.getId(item.getIdentity());
            } else {
                return this._model.getId(item as TabIdentifier);
            }
        });
    }

    private hasIdentity(item: (TabIdentifier|ObjectWithIdentity)): item is ObjectWithIdentity {
        return (item as ObjectWithIdentity).getIdentity !== undefined;
    }
}
