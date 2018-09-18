import {Fin, Window} from 'hadouken-js-adapter';

import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {Signal2} from '../Signal';
import {Point} from '../snapanddock/utils/PointUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';
import {ZIndexer} from '../tabbing/ZIndexer';

import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow, WindowIdentity, WindowState} from './DesktopWindow';

export class DesktopModel {
    private windows: DesktopWindow[];
    private tabGroups: DesktopTabGroup[];
    private snapGroups: DesktopSnapGroup[];
    private windowLookup: {[key: string]: DesktopWindow};
    private zIndexer: ZIndexer;

    /**
     * A window has been added to a group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: SnapGroup, window: SnapWindow)
     */
    public readonly onWindowAdded: Signal2<DesktopSnapGroup, DesktopWindow> = new Signal2();

    /**
     * A window has been removed from a group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: SnapGroup, window: SnapWindow)
     */
    public readonly onWindowRemoved: Signal2<DesktopSnapGroup, DesktopWindow> = new Signal2();

    constructor() {
        this.windows = [];
        this.tabGroups = [];
        this.snapGroups = [];
        this.windowLookup = {};
        this.zIndexer = new ZIndexer();

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

        // TODO: Prioritise by z-index
        return windowsAtPoint[0] || null;
    }

    public getTabGroupAt(x: number, y: number): DesktopTabGroup|null {
        // const point: Point = {x, y};
        // const groupsAtPoint: DesktopTabGroup[] = this.tabGroups.filter((tabGroup: DesktopTabGroup) => {
        //     const state: WindowState = tabGroup.window.getState();
        //     return RectUtils.isPointInRect(state.center, state.halfSize, point);
        // });

        // //TODO: Prioritise by z-index
        // return groupsAtPoint[0] || null;
        return null;
    }

    public getTabGroup(id: string): DesktopTabGroup|null {
        return this.tabGroups.find(group => group.ID === id) || null;
    }

    public deregister(target: {uuid: string; name: string}): void {
        const window: DesktopWindow|null = this.getWindow(target);

        if (window) {
            try {
                window.onClose.emit(window);
            } catch (error) {
                console.error(`Unexpected error when deregistering: ${error}`);
                throw new Error(`Unexpected error when deregistering: ${error}`);
            }
        } else {
            console.error(`Unable to deregister from Snap&Dock - no window is registered with identity "${target.uuid}/${target.name}"`);
            throw new Error(`Unable to deregister from Snap&Dock - no window is registered with identity "${target.uuid}/${target.name}"`);
        }
    }

    private async registerWindow(uuid: string, name: string): Promise<void> {
        const identity: WindowIdentity = {uuid, name};

        // Check that the service does not already have a matching window
        const existingSnapWindow = this.getWindow(identity);

        // The runtime will not allow multiple windows with the same uuid/name, so if we recieve a
        // window-created event for a registered window, it implies that our internal state is stale
        // and should be updated accordingly.
        if (existingSnapWindow) {
            existingSnapWindow.onClose.emit(existingSnapWindow);
        }

        // In either case, we will add the new window to the service.
        const finv2: Fin = fin as any;  // tslint:disable-line:no-any
        this.addWindow(await finv2.Window.wrap(identity)).then((win: DesktopWindow) => console.log('Registered window: ' + win.getId()));
    }

    private addWindow(window: Window): Promise<DesktopWindow> {
        return DesktopWindow.getWindowState(window).then<DesktopWindow>((state: WindowState): DesktopWindow => {
            // Create new window object. Will get registered implicitly, due to signal within DesktopWindow constructor.
            return new DesktopWindow(this, new DesktopSnapGroup(), window, state);
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

    private onWindowGroupChanged(event: fin.WindowGroupChangedEvent) {
        // // Each group operation will raise an event from every window involved. We should filter out to
        // // only receive the one from the window being moved.
        // if (event.name !== event.sourceWindowName || event.uuid !== event.sourceWindowAppUuid) {
        //     return;
        // }

        // console.log('Revieved window group changed event: ', event);
        // const sourceWindow = this.getWindow({uuid: event.sourceWindowAppUuid, name: event.sourceWindowName});

        // if (sourceWindow) {
        //     if (event.reason === 'leave') {
        //         sourceWindow.setSnapGroup(new DesktopSnapGroup(), undefined, undefined, true);
        //     } else {
        //         const targetWindow = this.getWindow({uuid: event.targetWindowAppUuid, name: event.targetWindowName});

        //         // Merge the groups
        //         if (targetWindow) {
        //             if (event.reason === 'merge') {
        //                 // Get array of SnapWindows from the native group window array
        //                 event.sourceGroup
        //                     .map(win => {
        //                         return this.getWindow({uuid: win.appUuid, name: win.windowName});
        //                     })
        //                     // Add all windows from source group to the target group.
        //                     // Windows are synthetic snapped since they are
        //                     // already native grouped.
        //                     .forEach((snapWin) => {
        //                         // Ignore any undefined results (i.e. windows unknown to the service)
        //                         if (snapWin !== null) {
        //                             snapWin.setSnapGroup(targetWindow.getSnapGroup(), undefined, undefined, true);
        //                         }
        //                     });
        //             } else {
        //                 sourceWindow.setSnapGroup(targetWindow.getSnapGroup(), undefined, undefined, true);
        //             }
        //         }
        //     }
        // }
    }

    private sendWindowAddedMessage(group: DesktopSnapGroup, window: DesktopWindow) {
        const identity = window.getIdentity();
        console.log('Window with identity', identity, 'added to group', group);
        this.onWindowAdded.emit(group, window);
    }

    private sendWindowRemovedMessage(group: DesktopSnapGroup, window: DesktopWindow) {
        const identity = window.getIdentity();
        console.log('Window with identity', identity, 'removed from group', group);
        this.onWindowRemoved.emit(group, window);
    }
}
