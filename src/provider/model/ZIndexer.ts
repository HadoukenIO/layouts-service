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
    active: boolean;
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
            if (item.active) {
                const index: number = ids.indexOf(item.id);
                if (index >= 0) {
                    return items[index];
                }
            }
        }

        return null;
    }

    public getWindowAt(x: number, y: number, exclusions: WindowIdentity[]): WindowIdentity|null {
        const entry: ZIndex|undefined = this._stack.find((item: ZIndex) => {
            const identity = item.identity;

            if (!item.active) {
                // Exclude inactive windows
                return false;
            } else if (identity.uuid === SERVICE_IDENTITY.uuid && !identity.name.startsWith('TABSET-')) {
                // Exclude service-owned windows
                return false;
            } else if (exclusions.some(exclusion => exclusion.uuid === identity.uuid && exclusion.name === identity.name)) {
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
     * Updates the state of the window tracked in the stack, and resorts windows
     * @param identity ID of the window to update (uuid, name)
     * @param active The active state of the window to update, if known. Will guess as true if needed and not specified
     * @param bounds Physical bounds of the window to update, if known. Will perform an async query if needed and not specified
     * @param timestamp The new timestamp for the stack entry. Will use the current time if not specified
     */
    private update(identity: WindowIdentity, active?: boolean, bounds?: Rect, timestamp?: number) {
        timestamp = timestamp !== undefined ? timestamp : Date.now();

        const id: string = this._model.getId(identity);
        const entry: ZIndex|undefined = this._stack.find(i => i.id === id);

        if (entry) {
            // Update existing entry
            entry.timestamp = timestamp;

            if (active !== undefined) {
                entry.active = active;
            }
            if (bounds) {
                Object.assign(entry.bounds, bounds);
            }
        } else if (!bounds) {
            // Must request bounds before being able to add
            fin.Window.wrapSync(identity).getBounds().then(bounds => {
                // Since this required an async operation, entry may now exist within stack, so recursively call update
                this.update(identity, active, this.sanitizeBounds(bounds), timestamp);
            });
        } else {
            // Can create & add a new entry synchronously
            this.addToStack({id, identity, timestamp, bounds, active: active !== undefined ? active : true});
        }

        this.sortStack();
    }

    private onWindowModified(identity: WindowIdentity, active?: boolean, bounds?: Rect): void {
        const modelWindow: DesktopWindow|null = this._model.getWindow(identity);
        const modelGroup: DesktopSnapGroup|null = modelWindow && modelWindow.snapGroup;

        if (modelGroup && modelGroup.length > 1) {
            // Also modify any windows within the group
            const id: string = this._model.getId(identity);

            modelGroup.windows.forEach(window => {
                const windowBounds = window.id === id ? bounds : undefined;
                const windowActive = window.id === id ? active : undefined;

                this.update(window.identity, windowActive, windowBounds);
            });
        } else {
            // Just modify single window
            this.update(identity, active, bounds);
        }
    }

    /**
     * Creates window event listeners on a specified window.
     * @param win Window to add the event listeners to.
     */
    private _addEventListeners(win: _Window) {
        const identity = win.identity as WindowIdentity;  // A window identity will always have a name, so it is safe to cast

        const bringToFront = () => {
            this.onWindowModified(identity, true);
        };
        const boundsChanged = (evt: WindowBoundsChange<'window', 'bounds-changed'>) => {
            this.onWindowModified(identity, undefined, this.sanitizeBounds(evt));
        };
        const markInactive = () => {
            this.onWindowModified(identity, false, undefined);
        };
        const onClose = () => {
            win.removeListener('focused', bringToFront);
            win.removeListener('shown', bringToFront);
            win.removeListener('bounds-changed', boundsChanged);
            // TODO (SERVICE-376): Uncomment these when below commented-out addListener calls are uncommented
            // win.removeListener('hidden', markInactive);
            // win.removeListener('minimized', markInactive);
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

        // When a window is hidden or minimized, mark it as inactive
        // TODO (SERVICE-376): Uncomment these and above removeListener calls to allow tracking of hidden non-Model
        // windows. Blocked on figuring out why events are not properly cleaned up on Jenkins
        // win.addListener('hidden', markInactive);
        // win.addListener('minimized', markInactive);

        // Remove listeners when the window is destroyed
        win.addListener('closed', onClose);

        // Add the window to the stack immediately, as there are rare cases where neither 'shown' nor 'focused' will be called
        // following the 'window-created' event. See SERVICE-380
        this.update(identity);
    }

    private addToStack(entry: ZIndex): void {
        this._stack.push(entry);
    }

    private sortStack(): void {
        this._stack.sort((a, b) => {
            if (a.active && !b.active) {
                return -1;
            } else if (!a.active && b.active) {
                return 1;
            } else {
                return b.timestamp - a.timestamp;
            }
        });
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
