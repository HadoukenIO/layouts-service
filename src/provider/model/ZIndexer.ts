import {WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';
import {WindowBoundsChange} from 'hadouken-js-adapter/out/types/src/api/events/window';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';
import {Rect} from 'hadouken-js-adapter/out/types/src/api/system/monitor';
import Bounds from 'hadouken-js-adapter/out/types/src/api/window/bounds';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {SERVICE_IDENTITY} from '../../client/internal';

import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopWindow, WindowIdentity} from './DesktopWindow';

export interface ZIndex {
    timestamp: number;
    id: string;
    identity: WindowIdentity;
    bounds: Rect;
}

interface ObjectWithIdentity {
    identity: WindowIdentity;
}

type Identifiable = WindowIdentity|ObjectWithIdentity;

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

        fin.System.addListener('window-created', (evt: WindowEvent<'system', 'window-created'>) => {
            const ofWin = fin.Window.wrapSync(evt);
            this._addEventListeners(ofWin);
        });

        // Register all existing applications
        fin.System.getAllApplications().then((apps: ApplicationInfo[]) => {
            apps.forEach((appInfo: ApplicationInfo) => {
                const app = fin.Application.wrapSync(appInfo);

                app.getWindow().then(win => {
                    this._addEventListeners(win);
                });
                app.getChildWindows().then(children => {
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
     * Takes a list of window-like items and returns the top-most item from the list.
     *
     * NOTE: Implementation will not return any item within the input that does not exist within the ZIndexer util.
     *
     * @param items Array of window or identity objects
     * @return The top-most of the input items, when sorted by z-index
     */
    public getTopMost<T extends Identifiable>(items: T[]): T|null {
        const ids: string[] = this.getIds(items);

        for (const item of this._stack) {
            const index: number = ids.indexOf(item.id);
            if (index >= 0) {
                return items[index];
            }
        }

        return null;
    }

    public getWindowAt(x: number, y: number, exclude?: WindowIdentity): WindowIdentity|null {
        const entry: ZIndex|undefined = this._stack.find((item: ZIndex) => {
            const identity = item.identity;

            if (identity.uuid === SERVICE_IDENTITY.uuid && !identity.name.startsWith('TABSET-')) {
                // Exclude service-owned windows
                return false;
            } else if (exclude && exclude.uuid === identity.uuid && exclude.name === identity.name) {
                // Item is excluded
                return false;
            } else {
                // Check if position is within window bounds
                const bounds = item.bounds;
                return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
            }
        });

        return entry ? entry.identity : null;
    }

    /**
     * Takes a list of window-like items, and sorts them by the z-index of their respective windows.
     *
     * NOTE: Implementation will filter-out any windows within the input that do not exist within the ZIndexer util.
     *
     * @param items
     */
    public sort<T extends Identifiable>(items: T[]): T[] {
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
     * Updates the windows index in the stack and sorts array.
     * @param identity ID of the window to update (uuid, name)
     * @param bounds Physical bounds of the window to update, if known
     */
    private update(identity: WindowIdentity, bounds?: Rect) {
        const id: string = this._model.getId(identity);
        const timestamp = Date.now();
        let entry: ZIndex|undefined = this._stack.find(i => i.id === id);

        if (entry) {
            // Update existing entry
            entry.timestamp = timestamp;
            if (bounds) {
                // Update bounds
                Object.assign(entry.bounds, bounds);
            }
        } else if (bounds) {
            // Can create & add a new entry synchronously
            this.addToStack({id, identity, timestamp, bounds});
        } else {
            // Must request bounds before being able to add
            fin.Window.wrapSync(identity).getBounds().then(bounds => {
                // Since this required an async operation, entry may now exist within stack
                entry = this._stack.find(i => i.id === id);

                if (entry) {
                    // Update bounds on existing entry
                    Object.assign(entry.bounds, bounds);
                } else {
                    // Continue with creating new entry
                    this.addToStack({id, identity, timestamp, bounds: this.sanitizeBounds(bounds)});
                }
            });
        }

        this._stack.sort((a, b) => {
            return b.timestamp - a.timestamp;
        });
    }

    private onWindowModified(identity: WindowIdentity, bounds?: Rect): void {
        const modelWindow: DesktopWindow|null = this._model.getWindow(identity);
        const modelGroup: DesktopSnapGroup|null = modelWindow && modelWindow.snapGroup;

        if (modelGroup && modelGroup.length > 1) {
            // Also bring-to-front any windows within the group
            const id: string = this._model.getId(identity);
            modelGroup.windows.forEach(window => this.update(window.identity, window.id === id ? bounds : undefined));
        } else {
            // Just bring modified window to front
            this.update(identity, bounds);
        }
    }

    /**
     * Creates window event listeners on a specified window.
     * @param win Window to add the event listeners to.
     */
    private _addEventListeners(win: _Window) {
        const identity = win.identity as WindowIdentity;  // A window identity will always have a name, so it is safe to cast

        const bringToFront = () => {
            this.onWindowModified(identity);
        };
        const boundsChanged = (evt: WindowBoundsChange<'window', 'bounds-changed'>) => {
            this.onWindowModified(identity, this.sanitizeBounds(evt));
        };
        const onClose = () => {
            win.removeListener('focused', bringToFront);
            win.removeListener('shown', bringToFront);
            win.removeListener('bounds-changed', boundsChanged);
            win.removeListener('closed', onClose);

            const id = `${identity.uuid}/${identity.name}`;
            const index = this._stack.findIndex(e => e.id === id);
            if (index >= 0) {
                this._stack.splice(index, 1);
            }
        };

        // When a window is brought to the front of the stack, update the z-index of the window and any grouped windows
        win.addListener('focused', bringToFront);
        win.addListener('shown', bringToFront);
        win.addListener('bounds-changed', boundsChanged);

        // Remove listeners when the window is destroyed
        win.addListener('closed', onClose);
    }

    private addToStack(entry: ZIndex): void {
        this._stack.push(entry);
    }

    private sanitizeBounds(input: Bounds): Rect {
        return {left: input.left, top: input.top, right: input.right || (input.left + input.width), bottom: input.bottom || (input.top + input.height)};
    }

    private getIds(items: Identifiable[]): string[] {
        return items.map((item: Identifiable) => {
            if (this.hasIdentity(item)) {
                return this._model.getId(item.identity);
            } else {
                return this._model.getId(item);
            }
        });
    }

    private hasIdentity(item: Identifiable): item is ObjectWithIdentity {
        return (item as ObjectWithIdentity).identity !== undefined;
    }
}
