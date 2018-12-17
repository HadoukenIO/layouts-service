import {Window} from 'hadouken-js-adapter';
import {WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';

import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {SignalSlot} from '../Signal';
import {Point} from '../snapanddock/utils/PointUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';
import {deregisterWindow as deregisterFromWorkspaces} from '../workspaces/create';

import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow, EntityState, WindowIdentity} from './DesktopWindow';
import {MouseTracker} from './MouseTracker';
import {ZIndexer} from './ZIndexer';

export class DesktopModel {
    private _windows: DesktopWindow[];
    private _tabGroups: DesktopTabGroup[];
    private _snapGroups: DesktopSnapGroup[];
    private _windowLookup: {[key: string]: DesktopWindow};
    private _zIndexer: ZIndexer;
    private _mouseTracker: MouseTracker;
    private _pendingRegistrations: WindowIdentity[];

    constructor() {
        this._windows = [];
        this._tabGroups = [];
        this._snapGroups = [];
        this._windowLookup = {};
        this._zIndexer = new ZIndexer(this);
        this._mouseTracker = new MouseTracker();
        this._pendingRegistrations = [];

        DesktopWindow.onCreated.add(this.onWindowCreated, this);
        DesktopWindow.onDestroyed.add(this.onWindowDestroyed, this);
        DesktopTabGroup.onCreated.add(this.onTabGroupCreated, this);
        DesktopTabGroup.onDestroyed.add(this.onTabGroupDestroyed, this);
        DesktopSnapGroup.onCreated.add(this.onSnapGroupCreated, this);
        DesktopSnapGroup.onDestroyed.add(this.onSnapGroupDestroyed, this);

        const serviceUUID: string = fin.Application.me.uuid;

        // Listen for any new windows created and register them with the service
        fin.System.addListener('window-created', (evt: WindowEvent<'system', 'window-created'>) => {
            // Filter out error windows (which should never register)
            if (this.isErrorWindow(evt.uuid)) {
                console.log('Ignoring error window: ' + evt.uuid);
                deregisterFromWorkspaces({name: evt.name, uuid: evt.uuid});
                return;
            }

            if (evt.uuid !== serviceUUID || evt.name.indexOf('Placeholder-') === 0) {
                this.registerWindow({name: evt.name, uuid: evt.uuid});
            }
        });

        fin.System.getAllWindows().then(apps => {
            apps.forEach((app) => {
                // Ignore openfin error windows, the main service window, and all of it's children
                if (!this.isErrorWindow(app.uuid) && app.uuid !== serviceUUID) {
                    // Register the main window
                    this.registerWindow({uuid: app.uuid, name: app.mainWindow.name});

                    // Register all of the child windows
                    app.childWindows.forEach((child) => {
                        this.registerWindow({uuid: app.uuid, name: child.name});
                    });
                }
            });
        });
    }

    public get mouseTracker(): MouseTracker {
        return this._mouseTracker;
    }

    public get windows(): ReadonlyArray<DesktopWindow> {
        return this._windows;
    }

    public get tabGroups(): ReadonlyArray<DesktopTabGroup> {
        return this._tabGroups;
    }

    public get snapGroups(): ReadonlyArray<DesktopSnapGroup> {
        return this._snapGroups;
    }

    public getId(identity: WindowIdentity): string {
        return `${identity.uuid}/${identity.name}`;
    }

    /**
     * Fetches the model object for the given window, or null if no window currently exists within the service.
     *
     * Window to find can be identified by
     *
     * @param identity Window identifier - either a UUID/name object, or a stringified identity as created by @see getId
     */
    public getWindow(identity: WindowIdentity|string): DesktopWindow|null {
        const id = typeof identity === 'string' ? identity : this.getId(identity);
        return this._windows.find(window => window.id === id) || null;
    }

    public getWindowAt(x: number, y: number, exclude?: WindowIdentity): DesktopWindow|null {
        const point: Point = {x, y};
        const excludeId: string|undefined = exclude && this.getId(exclude);
        const windowsAtPoint: DesktopWindow[] = this._windows.filter((window: DesktopWindow) => {
            const state: EntityState = window.currentState;
            return window.isActive && RectUtils.isPointInRect(state.center, state.halfSize, point) && window.id !== excludeId;
        });

        return this._zIndexer.getTopMost(windowsAtPoint);
    }

    public getTabGroup(id: string): DesktopTabGroup|null {
        return this._tabGroups.find(group => group.id === id) || null;
    }

    public deregister(target: WindowIdentity): void {
        // If the window is pending registration, remove it from the queue and return
        const pendingIndex = this._pendingRegistrations.findIndex(w => w.name === target.name && w.uuid === target.uuid);
        if (pendingIndex > -1) {
            this._pendingRegistrations.splice(pendingIndex, 1);
        } else {
            const window: DesktopWindow|null = this.getWindow(target);

            if (window) {
                try {
                    window.teardown();
                } catch (error) {
                    console.error(`Unexpected error when deregistering: ${error}`);
                    throw new Error(`Unexpected error when deregistering: ${error}`);
                }
            } else {
                console.error(`Unable to deregister from service - no window is registered with identity "${target.uuid}/${target.name}"`);
                throw new Error(`Unable to deregister from service - no window is registered with identity "${target.uuid}/${target.name}"`);
            }
        }
    }

    /**
     * Waits for a window with the given identity to be registered, then returns the DesktopWindow object for that
     * window. If the window already exists at the point where this function is called, the promise is resolved
     * immediately.
     *
     * By default the promise will time-out after a short delay, and the promise will be rejected. Set a timeout of
     * zero to wait indefinitely.
     *
     * @param identity The window that we are waiting to be registered
     * @param timeout How long we should wait, in milliseconds
     */
    public expect(identity: WindowIdentity, timeout = 1000): Promise<DesktopWindow> {
        let slot: SignalSlot|null = null;
        const windowPromise: Promise<DesktopWindow> = new Promise((resolve, reject) => {
            const window: DesktopWindow|null = this.getWindow(identity);
            const id = this.getId(identity);

            if (window) {
                resolve(window);
            } else {
                slot = DesktopWindow.onCreated.add((window: DesktopWindow) => {
                    if (window.id === id) {
                        slot!.remove();
                        resolve(window);
                    }
                });
            }
        });

        let promiseWithTimeout: Promise<DesktopWindow>;
        if (timeout > 0) {
            // Wait at-most 'timeout' milliseconds
            promiseWithTimeout = Promise.race([windowPromise, new Promise<DesktopWindow>((res, rej) => setTimeout(rej, timeout))]);
        } else {
            // Wait indefinitely
            promiseWithTimeout = windowPromise;
        }

        // Ensure we remove callback when promise resolves/rejects
        const removeSlot = (window: DesktopWindow) => {
            if (slot) {
                slot.remove();
            }
            return window;
        };
        return promiseWithTimeout.then(removeSlot, removeSlot);
    }

    private async registerWindow(identity: WindowIdentity): Promise<void> {
        // Check that the service does not already have a matching window
        const existingWindow = this.getWindow(identity);

        // The runtime will not allow multiple windows with the same uuid/name, so if we recieve a
        // window-created event for a registered window, it implies that our internal state is stale
        // and should be updated accordingly.
        if (existingWindow) {
            existingWindow.teardown();
        }

        // In either case, we will add the new window to the service.
        this.addWindow(await fin.Window.wrap(identity)).then((win: DesktopWindow|null) => {
            if (win !== null) {
                console.log('Registered window: ' + win.id);
            }
        });
    }

    private addWindow(window: Window): Promise<DesktopWindow|null> {
        // Set the window as pending registration  (Fix for race condition between register/deregister)
        const identity: WindowIdentity = window.identity as WindowIdentity;
        this._pendingRegistrations.push({...identity});
        return DesktopWindow.getWindowState(window).then<DesktopWindow|null>((state: EntityState): DesktopWindow|null => {
            if (!this._pendingRegistrations.some(w => w.name === identity.name && w.uuid === identity.uuid)) {
                // If pendingRegistrations does not contain the window, then deregister has been called on it
                // and we should do nothing.
                return null;
            } else {
                // Remove the window from pendingRegitrations
                const pendingIndex = this._pendingRegistrations.findIndex(w => w.name === identity.name && w.uuid === identity.uuid);
                this._pendingRegistrations.splice(pendingIndex, 1);

                // Create new window object. Will get registered implicitly, due to signal within DesktopWindow constructor.
                return new DesktopWindow(this, new DesktopSnapGroup(), window, state);
            }
        });
    }

    private onWindowCreated(window: DesktopWindow): void {
        const id: string = window.id;

        if (this._windowLookup[id]) {
            console.warn('Adding a new window with an existing ID', window);
            this.onWindowDestroyed(this._windowLookup[id]);
        }

        this._windows.push(window);
        this._windowLookup[id] = window;
    }

    private onWindowDestroyed(window: DesktopWindow): void {
        const id: string = window.id;
        const index: number = this._windows.indexOf(window);

        if (index >= 0) {
            this._windows.splice(index, 1);
            delete this._windowLookup[id];
        } else if (this._windowLookup[id]) {
            console.warn('A window existed within lookup, but now window list', window);
            delete this._windowLookup[id];
        }
    }

    private onTabGroupCreated(group: DesktopTabGroup): void {
        this._tabGroups.push(group);
    }

    private onTabGroupDestroyed(group: DesktopTabGroup): void {
        const index: number = this._tabGroups.indexOf(group);

        if (index >= 0) {
            // Can only remove empty groups. Otherwise, things will break.
            if (group.tabs.length !== 0) {
                console.warn('Removing a non-empty tab group, this should never happen', group);
            }
            this._tabGroups.splice(index, 1);
        }
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        this._snapGroups.push(group);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        const index: number = this._snapGroups.indexOf(group);

        if (index >= 0) {
            // Can only remove empty groups. Otherwise, things will break.
            if (group.length !== 0) {
                console.warn('Removing a non-empty snap group, this should never happen', group);
            }
            this._snapGroups.splice(index, 1);
        }
    }

    private isErrorWindow(uuid: string): boolean {
        return /error-app-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/g.test(uuid);
    }
}
