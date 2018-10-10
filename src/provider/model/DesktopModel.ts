import {Window} from 'hadouken-js-adapter';

import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {Point} from '../snapanddock/utils/PointUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';

import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow, WindowIdentity, WindowState} from './DesktopWindow';
import {MouseTracker} from './MouseTracker';
import {ZIndexer} from './ZIndexer';

export class DesktopModel {
    private windows: DesktopWindow[];
    private tabGroups: DesktopTabGroup[];
    private snapGroups: DesktopSnapGroup[];
    private windowLookup: {[key: string]: DesktopWindow};
    private zIndexer: ZIndexer;
    private mouseTracker: MouseTracker;

    private pendingRegistrations: WindowIdentity[];

    constructor() {
        this.windows = [];
        this.tabGroups = [];
        this.snapGroups = [];
        this.windowLookup = {};
        this.zIndexer = new ZIndexer(this);
        this.mouseTracker = new MouseTracker();

        this.pendingRegistrations = [];

        DesktopWindow.onCreated.add(this.onWindowCreated, this);
        DesktopWindow.onDestroyed.add(this.onWindowDestroyed, this);
        DesktopTabGroup.onCreated.add(this.onTabGroupCreated, this);
        DesktopTabGroup.onDestroyed.add(this.onTabGroupDestroyed, this);
        DesktopSnapGroup.onCreated.add(this.onSnapGroupCreated, this);
        DesktopSnapGroup.onDestroyed.add(this.onSnapGroupDestroyed, this);

        const serviceUUID: string = fin.desktop.Application.getCurrent().uuid;

        // Listen for any new windows created and register them with the service
        fin.desktop.System.addEventListener('window-created', (event: fin.WindowBaseEvent) => {
            // Ignore child windows of the service itself (e.g. preview windows)
            if (event.uuid !== serviceUUID) {
                this.registerWindow(event.uuid, event.name);
            }
        });

        // Register all existing windows
        fin.desktop.System.getAllWindows((windows: fin.WindowDetails[]) => {
            windows.forEach((app: fin.WindowDetails) => {
                // Ignore the main service window and all of it's children
                if (app.uuid !== serviceUUID) {
                    // Register the main window
                    this.registerWindow(app.uuid, app.mainWindow.name);

                    // Register all of the child windows
                    app.childWindows.forEach((child: fin.WindowInfo) => {
                        this.registerWindow(app.uuid, child.name);
                    });
                }
            });
        });
    }

    public getWindows(): ReadonlyArray<DesktopWindow> {
        return this.windows;
    }

    public getTabGroups(): ReadonlyArray<DesktopTabGroup> {
        return this.tabGroups;
    }

    public getSnapGroups(): ReadonlyArray<DesktopSnapGroup> {
        return this.snapGroups;
    }

    public getId(identity: WindowIdentity): string {
        return `${identity.uuid}/${identity.name}`;
    }


    public getMouseTracker(): MouseTracker {
        return this.mouseTracker;
    }

    public getWindow(identity: WindowIdentity): DesktopWindow|null {
        const id = this.getId(identity);
        return this.windows.find(window => window.getId() === id) || null;
    }

    public getWindowAt(x: number, y: number, exclude?: WindowIdentity): DesktopWindow|null {
        const point: Point = {x, y};
        const excludeId: string|undefined = exclude && this.getId(exclude);
        const windowsAtPoint: DesktopWindow[] = this.windows.filter((window: DesktopWindow) => {
            const state: WindowState = window.getState();
            return window.getIsActive() && RectUtils.isPointInRect(state.center, state.halfSize, point) && window.getId() !== excludeId;
        });

        return this.zIndexer.getTopMost(windowsAtPoint);
    }

    public getTabGroup(id: string): DesktopTabGroup|null {
        return this.tabGroups.find(group => group.ID === id) || null;
    }

    public deregister(target: WindowIdentity): void {
        // If the window is pending registration, remove it from the queue and return
        const pendingIndex = this.pendingRegistrations.findIndex(w => w.name === target.name && w.uuid === target.uuid);
        if (pendingIndex > -1) {
            this.pendingRegistrations.splice(pendingIndex, 1);
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

    private async registerWindow(uuid: string, name: string): Promise<void> {
        const identity: WindowIdentity = {uuid, name};

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
                console.log('Registered window: ' + win.getId());
            }
        });
    }

    private addWindow(window: Window): Promise<DesktopWindow|null> {
        // Set the window as pending registration  (Fix for race condition between register/deregister)
        const identity: WindowIdentity = window.identity as WindowIdentity;
        this.pendingRegistrations.push({...identity});
        return DesktopWindow.getWindowState(window).then<DesktopWindow|null>((state: WindowState): DesktopWindow|null => {
            if (!this.pendingRegistrations.some(w => w.name === identity.name && w.uuid === identity.uuid)) {
                // If pendingRegistrations does not contain the window, then deregister has been called on it
                // and we should do nothing.
                return null;
            } else {
                // Remove the window from pendingRegitrations
                const pendingIndex = this.pendingRegistrations.findIndex(w => w.name === identity.name && w.uuid === identity.uuid);
                this.pendingRegistrations.splice(pendingIndex, 1);

                // Create new window object. Will get registered implicitly, due to signal within DesktopWindow constructor.
                return new DesktopWindow(this, new DesktopSnapGroup(), window, state);
            }
        });
    }

    private onWindowCreated(window: DesktopWindow): void {
        const id: string = window.getId();

        if (this.windowLookup[id]) {
            console.warn('Adding a new window with an existing ID', window);
            this.onWindowDestroyed(this.windowLookup[id]);
        }

        this.windows.push(window);
        this.windowLookup[id] = window;
    }

    private onWindowDestroyed(window: DesktopWindow): void {
        const id: string = window.getId();
        const index: number = this.windows.indexOf(window);

        if (index >= 0) {
            this.windows.splice(index, 1);
            delete this.windowLookup[id];
        } else if (this.windowLookup[id]) {
            console.warn('A window existed within lookup, but now window list', window);
            delete this.windowLookup[id];
        }
    }

    private onTabGroupCreated(group: DesktopTabGroup): void {
        this.tabGroups.push(group);
    }

    private onTabGroupDestroyed(group: DesktopTabGroup): void {
        const index: number = this.tabGroups.indexOf(group);

        if (index >= 0) {
            // Can only remove empty groups. Otherwise, things will break.
            if (group.tabs.length !== 0) {
                console.warn('Removing a non-empty tab group, this should never happen', group);
            }
            this.tabGroups.splice(index, 1);
        }
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        this.snapGroups.push(group);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        const index: number = this.snapGroups.indexOf(group);

        if (index >= 0) {
            // Can only remove empty groups. Otherwise, things will break.
            if (group.length !== 0) {
                console.warn('Removing a non-empty snap group, this should never happen', group);
            }
            this.snapGroups.splice(index, 1);
        }
    }
}
