import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup, Snappable} from '../model/DesktopSnapGroup';
import {DesktopTabGroup} from '../model/DesktopTabGroup';
import {DesktopWindow, eTransformType, Mask, WindowIdentity} from '../model/DesktopWindow';
import {Signal2} from '../Signal';
import {ApplicationConfigManager} from '../tabbing/components/ApplicationConfigManager';
import {TabService} from '../tabbing/TabService';

import {eSnapValidity, Resolver, SnapTarget} from './Resolver';
import {SnapView} from './SnapView';
import {Point, PointUtils} from './utils/PointUtils';
import {MeasureResult, RectUtils} from './utils/RectUtils';

// Defines the distance windows will be moved when undocked.
const UNDOCK_MOVE_DISTANCE = 30;

// Scaling factor for explosion spread.
const EXPLODE_MOVE_SCALE = 0.1;

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
    activeGroup: DesktopWindow|null;

    /**
     * The current candidate for the snapping action. The group to which 'activeGroup' will be snapped to if the user
     * releases the window right now.
     *
     * Will be null when there is no valid snap target.
     */
    target: SnapTarget|null;
}

export class SnapService {
    private model: DesktopModel;

    private resolver: Resolver;
    private view: SnapView;

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

    constructor(model: DesktopModel) {
        this.model = model;
        this.resolver = new Resolver();
        this.view = new SnapView();

        // Register lifecycle listeners
        DesktopWindow.onCreated.add(this.onWindowCreated, this);
        DesktopWindow.onDestroyed.add(this.onWindowDestroyed, this);
        DesktopSnapGroup.onCreated.add(this.onSnapGroupCreated, this);
        DesktopSnapGroup.onDestroyed.add(this.onSnapGroupDestroyed, this);

        // Register global undock hotkey listener
        // @ts-ignore - v2api types missing
        fin.GlobalHotkey
            .register(
                'CommandOrControl+Shift+U',
                () => {
                    // @ts-ignore - v2api types missing
                    fin.System.getFocusedWindow().then(focusedWindow => {
                        if (focusedWindow !== null && model.getWindow(focusedWindow)) {
                            console.log('Global hotkey invoked on window', focusedWindow);
                            this.undock(focusedWindow);
                        }
                    });
                })
            .catch(console.error);
    }

    public undock(target: {uuid: string; name: string}): void {
        const window: DesktopWindow|null = this.model.getWindow(target);

        if (window) {
            try {
                // Calculate undock offset
                const offset = this.calculateUndockMoveDirection(window);

                if (offset.x || offset.y) {
                    offset.x = Math.sign(offset.x) * UNDOCK_MOVE_DISTANCE;
                    offset.y = Math.sign(offset.y) * UNDOCK_MOVE_DISTANCE;
                } else {
                    offset.x = offset.y = UNDOCK_MOVE_DISTANCE;
                }

                // Move window to it's own group, whilst applying offset
                window.setSnapGroup(new DesktopSnapGroup(), offset);
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
        const window: DesktopWindow|null = this.model.getWindow(target);

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

    /**
     * Explodes a group. All windows in the group are unlocked.
     * @param targetWindow A window which is a member of the group to be exploded.
     */
    public explodeGroup(targetWindow: {uuid: string; name: string}): void {
        // NOTE: Since there is currently not a schema to identify a group, this method
        // accepts a window that is a member of the group. Once there is a way of uniquely
        // identifying groups, this can be changed

        // Get the group containing the targetWindow
        const groups: ReadonlyArray<DesktopSnapGroup> = this.model.getSnapGroups();
        const group: DesktopSnapGroup|undefined = groups.find((g) => {
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
                    // Undock the windows, applying previously calculated offset
                    window.setSnapGroup(new DesktopSnapGroup(), offsets[i]);
                }
            }
        } catch (error) {
            console.error(`Unexpected error when undocking group: ${error}`);
            throw new Error(`Unexpected error when undocking group: ${error}`);
        }
    }

    private onWindowCreated(window: DesktopWindow): void {
        window.onClose.add(this.onWindowClosed, this);
    }

    private onWindowDestroyed(window: DesktopWindow): void {
        window.onClose.remove(this.onWindowClosed, this);
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        group.onModified.add(this.validateGroup, this);
        group.onTransform.add(this.snapGroup, this);
        group.onCommit.add(this.applySnapTarget, this);
        group.onWindowRemoved.add(this.onWindowRemovedFromGroup, this);
        group.onWindowAdded.add(this.sendWindowAddedMessage, this);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        group.onModified.remove(this.validateGroup, this);
        group.onTransform.remove(this.snapGroup, this);
        group.onCommit.remove(this.applySnapTarget, this);
        group.onWindowRemoved.remove(this.onWindowRemovedFromGroup, this);
        group.onWindowAdded.remove(this.sendWindowAddedMessage, this);
    }

    private onWindowClosed(snapWindow: DesktopWindow): void {
        // NOTE: At this point, snapWindow will belong to a group.
        // SnapGroup also listens to 'onClose' of each of it's windows, and will remove the window from itself.
        snapWindow.onClose.remove(this.onWindowClosed, this);

        this.validateGroup(snapWindow.getSnapGroup(), snapWindow);
    }

    private onWindowRemovedFromGroup(group: DesktopSnapGroup, window: DesktopWindow): void {
        // if (group.length === 0) {
        //     // Empty groups are not allowed
        //     this.removeGroup(group);
        // }
        // Raise event to client
        this.sendWindowRemovedMessage(group, window);

        this.validateGroup(group, window);
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

    private validateGroup(group: DesktopSnapGroup, modifiedWindow: DesktopWindow): void {
        // Ensure 'group' is still a valid, contiguous group.
        // NOTE: 'modifiedWindow' may no longer exist (if validation is being performed because a window was closed)

        // TODO (SERVICE-130)
    }

    private snapGroup(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>): void {
        const groups: DesktopSnapGroup[] = this.model.getSnapGroups() as DesktopSnapGroup[];  // TODO: Make read-only?
        const snapTarget: SnapTarget|null = this.resolver.getSnapTarget(groups, activeGroup);

        this.view.update(activeGroup, snapTarget);
    }

    private applySnapTarget(activeGroup: DesktopSnapGroup): void {
        const groups: DesktopSnapGroup[] = this.model.getSnapGroups() as DesktopSnapGroup[];  // TODO: Make read-only?
        const snapTarget: SnapTarget|null = this.resolver.getSnapTarget(groups, activeGroup);

        if (snapTarget && snapTarget.validity === eSnapValidity.VALID) {  // SNAP WINDOWS
            // Reset view (do this before moving windows out of active group, to ensure opacities are reset)
            // this.view.update(null, null);

            // Move all windows in activeGroup to snapTarget.group
            activeGroup.windows.forEach((window: Snappable) => {
                if (window === snapTarget.activeWindow && snapTarget.halfSize) {
                    window.setSnapGroup(snapTarget.group, snapTarget.snapOffset, snapTarget.halfSize);
                } else {
                    window.setSnapGroup(snapTarget.group, snapTarget.snapOffset);
                }
            });

            // The active group should now have been removed (since it is empty)
            if (groups.indexOf(activeGroup) >= 0) {
                console.warn(
                    'Expected group to have been removed, but still exists (' + activeGroup.id + ': ' + activeGroup.windows.map(w => w.getId()).join() + ')');
            }
        } else if (activeGroup.length === 1 && !activeGroup.windows[0].getTabGroup()) {  // TAB WINDOWS
            // If a single untabbed window is being dragged, it is possible to create a tabset
            const activeWindow: DesktopWindow = activeGroup.windows[0] as DesktopWindow;
            const activeIdentity: WindowIdentity = activeWindow.getIdentity();
            const activeState = activeGroup.windows[0].getState();

            // Ignore if we are dragging around a tabset
            if (activeWindow instanceof DesktopWindow) {
                const windowUnderPoint: DesktopWindow|null = this.model.getWindowAt(activeState.center.x, activeState.center.y, activeIdentity);
                const appConfigMgr: ApplicationConfigManager = TabService.INSTANCE.applicationConfigManager;

                // There is a window under our drop point
                if (windowUnderPoint) {
                    if (appConfigMgr.compareConfigBetweenApplications(windowUnderPoint.getIdentity().uuid, activeIdentity.uuid)) {
                        const existingTabSet: DesktopTabGroup|null = windowUnderPoint.getTabGroup();

                        if (existingTabSet) {
                            // Add to existing tab group
                            existingTabSet.addTab(activeWindow);
                        } else if (windowUnderPoint instanceof DesktopWindow) {
                            // If not a tab group then create a group with the 2 tabs.
                            TabService.INSTANCE.createTabGroupWithTabs([windowUnderPoint.getIdentity(), activeIdentity]);
                        }
                    }
                }
            }
        }

        // Reset view
        this.view.update(null, null);
    }

    private calculateUndockMoveDirection(window: DesktopWindow): Point {
        const group = window.getSnapGroup();
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
}
