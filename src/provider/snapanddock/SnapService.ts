import {Tab} from '../tabbing/Tab';
import {TabService} from '../tabbing/TabService';
import {getWindowAt} from '../tabbing/TabUtilities';

import {EXPLODE_MOVE_SCALE, UNDOCK_MOVE_DISTANCE} from './Config';
import {eSnapValidity, Resolver, SnapTarget} from './Resolver';
import {Signal2} from './Signal';
import {SnapGroup} from './SnapGroup';
import {SnapView} from './SnapView';
import {eTransformType, Mask, SnapWindow, WindowIdentity, WindowState} from './SnapWindow';
import {Point, PointUtils} from './utils/PointUtils';
import {MeasureResult, RectUtils} from './utils/RectUtils';

/**
 * For passing state between service and view.
 *
 * May not be necessary. This is still WIP/TBD.
 */
export interface SnapState {
    /**
     * The group currently being dragged by the user.
     *
     * Only set when user is actually dragging a window, otherwise null. When this is null, other values within this
     * interface do not apply.
     */
    activeGroup: SnapWindow|null;

    /**
     * The current candidate for the snapping action. The group to which 'activeGroup' will be snapped to if the user
     * releases the window right now.
     *
     * Will be null when there is no valid snap target.
     */
    target: SnapTarget|null;
}

export class SnapService {
    private windows: SnapWindow[];
    private groups: SnapGroup[];

    private resolver: Resolver;
    private view: SnapView;

    private pendingRegistrations: WindowIdentity[] = [];

    /**
     * A window has been added to a group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: SnapGroup, window: SnapWindow)
     */
    public readonly onWindowAdded: Signal2<SnapGroup, SnapWindow> = new Signal2();

    /**
     * A window has been removed from a group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: SnapGroup, window: SnapWindow)
     */
    public readonly onWindowRemoved: Signal2<SnapGroup, SnapWindow> = new Signal2();

    constructor() {
        this.windows = [];
        this.groups = [];
        this.resolver = new Resolver();
        this.view = new SnapView();

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

        // Register global undock hotkey listener
        fin.GlobalHotkey
            .register(
                'CommandOrControl+Shift+U',
                () => {
                    fin.desktop.System.getFocusedWindow(focusedWindow => {
                        if (focusedWindow !== null && this.getSnapWindow(focusedWindow)) {
                            console.log('Global hotkey invoked on window', focusedWindow);
                            this.undock(focusedWindow);
                        }
                    });
                })
            .catch(console.error);
    }

    public undock(target: {uuid: string; name: string}): void {
        const window: SnapWindow|undefined = this.getSnapWindow(target);

        if (window) {
            try {
                const group: SnapGroup = window.getGroup();

                // Only do anything if the window is actually grouped
                if (group.length > 1) {
                    let offset = this.calculateUndockMoveDirection(window);

                    window.setGroup(this.addGroup());

                    if (!offset.x && !offset.y) {
                        offset = {x: 1, y: 1};
                    }
                    window.offsetBy({x: Math.sign(offset.x) * UNDOCK_MOVE_DISTANCE, y: Math.sign(offset.y) * UNDOCK_MOVE_DISTANCE});
                }
            } catch (error) {
                console.error(`Unexpected error when undocking window: ${error}`);
                throw new Error(`Unexpected error when undocking window: ${error}`);
            }

        } else {
            console.error(`Unable to undock - no window found with identity "${target.uuid}/${target.name}"`);
            throw new Error(`Unable to undock - no window found with identity "${target.uuid}/${target.name}"`);
        }
    }

    public deregister(target: {uuid: string; name: string}): void {
        // If the window is pending registration, remove it from the queue and return
        const pendingIndex = this.pendingRegistrations.findIndex(w => w.name === target.name && w.uuid === target.uuid);
        if (pendingIndex > -1) {
            this.pendingRegistrations.splice(pendingIndex, 1);
        } else {
            const window: SnapWindow|undefined = this.getSnapWindow(target);

            if (window) {
                try {
                    window.getWindow().leaveGroup();
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
    }

    /**
     * Explodes a group. All windows in the group are unlocked.
     * @param targetWindow A window which is a member of the group to be exploded.
     */
    public explodeGroup(targetWindow: {uuid: string; name: string}): void {
        // NOTE: Since there is currently not a schema to identify a group, this method
        // accepts a window that is a member of the group. Once there is a way of uniquely
        // identifying groups, this can be changed

        // Get the group containing the targetWindow
        const group: SnapGroup|undefined = this.groups.find((g) => {
            return g.windows.findIndex(w => w.getIdentity().uuid === targetWindow.uuid && w.getIdentity().name === targetWindow.name) >= 0;
        });

        if (!group) {
            console.error(`Unable to undock - no group found for window with identity "${targetWindow.uuid}/${targetWindow.name}"`);
            throw new Error(`Unable to undock - no group found for window with identity "${targetWindow.uuid}/${targetWindow.name}"`);
        }

        try {
            // Exploding only makes sense if there is more than one window in the group.
            if (group && group.length > 1) {
                const windows = group.windows;
                // Determine the offset for each window before modifying and window state
                const offsets: Point[] = [];
                // group.center is recalculated on each call, so we assign it here once and use the value.
                const groupCenter = group.center;
                for (let i = 0; i < windows.length; i++) {
                    const windowState = windows[i].getState();
                    offsets[i] = PointUtils.scale(PointUtils.difference(groupCenter, windowState.center), EXPLODE_MOVE_SCALE);
                }

                for (let i = 0; i < windows.length; i++) {
                    const window = windows[i];
                    // Undock the windows
                    window.setGroup(this.addGroup());
                    // Apply previously calculated offset
                    window.offsetBy(offsets[i]);
                }
            }
        } catch (error) {
            console.error(`Unexpected error when undocking group: ${error}`);
            throw new Error(`Unexpected error when undocking group: ${error}`);
        }
    }

    private registerWindow(uuid: string, name: string): void {
        const newOFWindow: fin.OpenFinWindow = fin.desktop.Window.wrap(uuid, name);

        // Check that the service does not already have a matching window
        const existingSnapWindow = this.getSnapWindow(newOFWindow);

        // The runtime will not allow multiple windows with the same uuid/name, so if we recieve a
        // window-created event for a registered window, it implies that our internal state is stale
        // and should be updated accordingly.
        if (existingSnapWindow) {
            existingSnapWindow.onClose.emit(existingSnapWindow);
        }

        // In either case, we will add the new window to the service.
        this.addWindow(newOFWindow).then((win: SnapWindow|null) => {
            if (win !== null) {
                console.log('Registered window: ' + win.getId());
            }
        });
    }

    private addWindow(window: fin.OpenFinWindow): Promise<SnapWindow|null> {
        // Set the window as pending registration  (Fix for race condition between register/deregister)
        this.pendingRegistrations.push(window);
        return SnapWindow.getWindowState(window).then<SnapWindow|null>((state: WindowState): SnapWindow|null => {
            if (!this.pendingRegistrations.some(w => w.name === window.name && w.uuid === window.uuid)) {
                // If pendingRegistrations does not contain the window, then deregister has been called on it
                // and we should do nothing.
                return null;
            } else {
                const group: SnapGroup = this.addGroup();
                const snapWindow: SnapWindow = new SnapWindow(group, window, state);

                snapWindow.onClose.add(this.onWindowClosed, this);
                this.windows.push(snapWindow);

                window.addEventListener('group-changed', this.onWindowGroupChanged.bind(this));

                // Remove the window from pendingRegitrations
                const pendingIndex = this.pendingRegistrations.findIndex(w => w.name === window.name && w.uuid === window.uuid);
                this.pendingRegistrations.splice(pendingIndex, 1);

                return snapWindow;
            }
        });
    }

    private addGroup(): SnapGroup {
        const group: SnapGroup = new SnapGroup();
        group.onModified.add(this.validateGroup, this);
        group.onTransform.add(this.snapGroup, this);
        group.onCommit.add(this.applySnapTarget, this);
        group.onWindowRemoved.add(this.onWindowRemovedFromGroup, this);
        group.onWindowAdded.add(this.sendWindowAddedMessage, this);
        this.groups.push(group);
        return group;
    }

    private removeGroup(group: SnapGroup): void {
        const index: number = this.groups.indexOf(group);

        // Can only remove empty groups. Otherwise, things will break.
        if (group.length === 0 && index >= 0) {
            group.onModified.remove(this.validateGroup, this);
            group.onTransform.remove(this.snapGroup, this);
            group.onCommit.remove(this.applySnapTarget, this);
            group.onWindowRemoved.remove(this.onWindowRemovedFromGroup, this);
            group.onWindowAdded.remove(this.sendWindowAddedMessage, this);
            this.groups.splice(index, 1);
        }
    }

    private onWindowGroupChanged(event: fin.WindowGroupChangedEvent) {
        // Each group operation will raise an event from every window involved. We should filter out to
        // only receive the one from the window being moved.
        if (event.name !== event.sourceWindowName || event.uuid !== event.sourceWindowAppUuid) {
            return;
        }


        console.log('Revieved window group changed event: ', event);
        const sourceWindow = this.getSnapWindow({uuid: event.sourceWindowAppUuid, name: event.sourceWindowName});

        if (sourceWindow) {
            if (event.reason === 'leave') {
                sourceWindow.setGroup(this.addGroup(), undefined, undefined, true);
            } else {
                const targetWindow = this.getSnapWindow({uuid: event.targetWindowAppUuid, name: event.targetWindowName});

                // Merge the groups
                if (targetWindow) {
                    if (event.reason === 'merge') {
                        // Get array of SnapWindows from the native group window array
                        event.sourceGroup
                            .map(win => {
                                return this.getSnapWindow({uuid: win.appUuid, name: win.windowName});
                            })
                            // Add all windows from source group to the target group.
                            // Windows are synthetic snapped since they are
                            // already native grouped.
                            .forEach((snapWin) => {
                                // Ignore any undefined results (i.e. windows unknown to the service)
                                if (snapWin !== undefined) {
                                    snapWin.setGroup(targetWindow.getGroup(), undefined, undefined, true);
                                }
                            });
                    } else {
                        sourceWindow.setGroup(targetWindow.getGroup(), undefined, undefined, true);
                    }
                }
            }
        }
    }

    private onWindowClosed(snapWindow: SnapWindow): void {
        const index: number = this.windows.indexOf(snapWindow);

        // NOTE: At this point, snapWindow will belong to a group.
        // SnapGroup also listens to 'onClose' of each of it's windows, and will remove the window from itself.

        // Remove this window from the service
        if (index >= 0) {
            this.windows.splice(index, 1);

            snapWindow.onClose.remove(this.onWindowClosed, this);

            this.validateGroup(snapWindow.getGroup(), snapWindow);
        }
    }

    private onWindowRemovedFromGroup(group: SnapGroup, window: SnapWindow): void {
        if (group.length === 0) {
            // Empty groups are not allowed
            this.removeGroup(group);
        }
        // Raise event to client
        this.sendWindowRemovedMessage(group, window);

        this.validateGroup(group, window);
    }

    private sendWindowAddedMessage(group: SnapGroup, window: SnapWindow) {
        const identity = window.getIdentity();
        console.log('Window with identity', identity, 'added to group', group);
        this.onWindowAdded.emit(group, window);
    }

    private sendWindowRemovedMessage(group: SnapGroup, window: SnapWindow) {
        const identity = window.getIdentity();
        console.log('Window with identity', identity, 'removed from group', group);
        this.onWindowRemoved.emit(group, window);
    }

    private validateGroup(group: SnapGroup, modifiedWindow: SnapWindow): void {
        // Ensure 'group' is still a valid, contiguous group.
        // NOTE: 'modifiedWindow' may no longer exist (if validation is being performed because a window was closed)

        // TODO (SERVICE-130)
    }

    private snapGroup(activeGroup: SnapGroup, type: Mask<eTransformType>): void {
        const snapTarget: SnapTarget|null = this.resolver.getSnapTarget(this.groups, activeGroup);

        this.view.update(activeGroup, snapTarget);
    }

    private applySnapTarget(activeGroup: SnapGroup): void {
        const snapTarget: SnapTarget|null = this.resolver.getSnapTarget(this.groups, activeGroup);

        // SNAP WINDOWS
        if (snapTarget && snapTarget.validity === eSnapValidity.VALID && (!(window as Window & {foo: boolean}).foo)) {
            // Move all windows in activeGroup to snapTarget.group
            activeGroup.windows.forEach((window: SnapWindow) => {
                if (window === snapTarget.activeWindow && snapTarget.halfSize) {
                    window.setGroup(snapTarget.group, snapTarget.snapOffset, snapTarget.halfSize);
                } else {
                    window.setGroup(snapTarget.group, snapTarget.snapOffset);
                }
            });

            // The active group should now have been removed (since it is empty)
            if (this.groups.indexOf(activeGroup) >= 0) {
                console.warn(
                    'Expected group to have been removed, but still exists (' + activeGroup.id + ': ' + activeGroup.windows.map(w => w.getId()).join() + ')');
            }
            // TAB WINDOWS
        } else if (activeGroup.length === 1 && !TabService.INSTANCE.disableTabbingOperations) {
            const currentDragWindowIdentity: WindowIdentity = activeGroup.windows[0].getIdentity();
            // If a single untabbed window is being dragged, it is possible to create a tabset
            const activeState = activeGroup.windows[0].getState();

            // Ignore if we are dragging around a tabset
            if (!TabService.INSTANCE.getTabGroupByApp(currentDragWindowIdentity)) {
                const windowUnderPoint = getWindowAt(activeState.center.x, activeState.center.y, currentDragWindowIdentity);

                // There is a window under our drop point
                if (windowUnderPoint) {
                    if (TabService.INSTANCE.applicationConfigManager.compareConfigBetweenApplications(windowUnderPoint.uuid, currentDragWindowIdentity.uuid)) {
                        const tabGroupUnderPoint = TabService.INSTANCE.getTabGroupByApp(windowUnderPoint);
                        // The window under drop point is a tab group
                        if (tabGroupUnderPoint) {
                            // Add Tab
                            const tab = new Tab({tabID: currentDragWindowIdentity});
                            tab.init()
                                .then(() => {
                                    tabGroupUnderPoint.addTab(tab);
                                })
                                .catch((e) => {
                                    console.error(e);
                                });
                        } else {
                            // If not a tab group then create a group with the 2 tabs.
                            TabService.INSTANCE.createTabGroupWithTabs([windowUnderPoint, currentDragWindowIdentity]);
                        }
                    }
                }
            }
        }

        // Reset view
        this.view.update(null, null);
    }

    private calculateUndockMoveDirection(window: SnapWindow): Point {
        const group = window.getGroup();
        const totalOffset: Point = {x: 0, y: 0};
        for (const groupedWindow of group.windows) {
            // Exclude window being unsnapped
            if (groupedWindow !== window) {
                const distance: MeasureResult = RectUtils.distance(window.getState(), groupedWindow.getState());
                if (distance.minAbs === 0 && distance.min < 0) {
                    // The x and y at the end are intentionally swapped. This makes sure that each adjoining window will only cause a move on a single axis.
                    totalOffset.x = totalOffset.x + Math.sign((window.getState().center.x - groupedWindow.getState().center.x) * Math.abs(distance.y));
                    totalOffset.y = totalOffset.y + Math.sign((window.getState().center.y - groupedWindow.getState().center.y) * Math.abs(distance.x));
                }
            }
        }
        return totalOffset;
    }

    private getSnapWindow(finWindow: WindowIdentity) {
        return this.windows.find(w => w.getIdentity().uuid === finWindow.uuid && w.getIdentity().name === finWindow.name);
    }
}
