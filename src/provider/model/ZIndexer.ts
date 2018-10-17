import {TabIdentifier} from '../../client/types';
import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopWindow, WindowIdentity} from './DesktopWindow';
import { WindowEvent, ApplicationEvent } from 'hadouken-js-adapter/out/types/src/api/events/base';
import { _Window } from 'hadouken-js-adapter/out/types/src/api/window/window';
import { ApplicationInfo } from 'hadouken-js-adapter/out/types/src/api/system/application';

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

        fin.System.addListener('window-created', (evt: WindowEvent<"system", "window-created">) => {
            const ofWin = fin.Window.wrapSync(evt);
            this._addEventListeners(ofWin);
        });
        
        // Register all existing applications
        fin.System.getAllApplications().then((apps:ApplicationInfo[]) => {
            apps.forEach( (appInfo: ApplicationInfo) => {
                const app = fin.Application.wrapSync(appInfo);

                app.getWindow().then(win => {
                    this._addEventListeners(win);
                });
                app.getChildWindows().then( children => {
                    children.forEach(child => {
                        this._addEventListeners(child);
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
    private _addEventListeners(win: _Window) {
        const identity = win.identity as WindowIdentity; // A window identity will always have a name, so it is safe to cast

        const bringToFront = () => {
            const modelWindow: DesktopWindow|null = this._model.getWindow(identity);
            const modelGroup: DesktopSnapGroup|null = modelWindow && modelWindow.getSnapGroup();

            if (modelGroup && modelGroup.length > 1) {
                // Also bring-to-front any windows within the group
                modelGroup.windows.forEach(window => this.update(window.getIdentity()));
            } else {
                // Just bring modified window to front
                this.update(identity);
            }
        };
        const onClose = () => {
            win.removeListener('focused', bringToFront);
            win.removeListener('shown', bringToFront);
            win.removeListener('bounds-changed', bringToFront);
            win.removeListener('closed', onClose);
        };

        // When a window is brought to the front of the stack, update the z-index of the window and any grouped windows
        win.addListener('focused', bringToFront);
        win.addListener('shown', bringToFront);
        win.addListener('bounds-changed', bringToFront);

        // Remove listeners when the window is destroyed
        win.addListener('closed', onClose);
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
