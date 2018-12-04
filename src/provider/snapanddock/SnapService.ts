import {tabService} from '../main';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup, Snappable} from '../model/DesktopSnapGroup';
import {DesktopWindow, eTransformType, Mask, WindowIdentity} from '../model/DesktopWindow';

import {EXPLODE_MOVE_SCALE, MIN_OVERLAP, UNDOCK_MOVE_DISTANCE} from './Config';
import {eSnapValidity, Resolver, SnapTarget} from './Resolver';
import {SnapView} from './SnapView';
import {Debounced} from './utils/Debounced';
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
    /**
     * Any windows less than this distance apart will be considered as touching for the purposes of the validateGroup
     *
     * This is a workaround for runtime issues due to be fixed in v37.
     */
    private static VALIDATE_GROUP_DISTANCE = 14;

    /**
     * Flag to disable / enable docking.
     */
    public disableDockingOperations = false;

    private model: DesktopModel;

    private resolver: Resolver;
    private view: SnapView;

    private validateGroups: Debounced<(group: DesktopSnapGroup) => void, SnapService, [DesktopSnapGroup]>;

    constructor(model: DesktopModel) {
        this.model = model;
        this.resolver = new Resolver();
        this.view = new SnapView();
        this.validateGroups = new Debounced(this.validateGroupInternal, this);

        // Register lifecycle listeners
        DesktopSnapGroup.onCreated.add(this.onSnapGroupCreated, this);
        DesktopSnapGroup.onDestroyed.add(this.onSnapGroupDestroyed, this);

        // Register global undock hotkey listener
        fin.GlobalHotkey
            .register(
                'CommandOrControl+Shift+U',
                () => {
                    fin.desktop.System.getFocusedWindow(focusedWindow => {
                        if (focusedWindow !== null && model.getWindow(focusedWindow)) {
                            console.log('Global hotkey invoked on window', focusedWindow);
                            this.undock(focusedWindow);
                        }
                    });
                })
            .catch(console.error);
    }

    public async undock(target: WindowIdentity): Promise<void> {
        const window: DesktopWindow|null = this.model.getWindow(target);

        // Do nothing for tabbed windows until tab/snap is properly integrated
        if (window && window.getSnapGroup().snappables.length > 1) {
            const snappable: Snappable = window.getTabGroup() || window;

            try {
                // Calculate undock offset
                const offset = this.calculateUndockMoveDirection(snappable);

                if (offset.x || offset.y) {
                    offset.x = Math.sign(offset.x) * UNDOCK_MOVE_DISTANCE;
                    offset.y = Math.sign(offset.y) * UNDOCK_MOVE_DISTANCE;
                } else {
                    offset.x = offset.y = UNDOCK_MOVE_DISTANCE;
                }

                // Move window to it's own group, whilst applying offset
                const group = new DesktopSnapGroup();
                await snappable.setSnapGroup(group);
                await snappable.applyOffset(offset, snappable.getState().halfSize);
            } catch (error) {
                console.error(`Unexpected error when undocking window: ${error}`);
                throw new Error(`Unexpected error when undocking window: ${error}`);
            }
        } else if (!window) {
            console.error(`Unable to undock - no window found with identity "${target.uuid}/${target.name}"`);
            throw new Error(`Unable to undock - no window found with identity "${target.uuid}/${target.name}"`);
        }
    }

    /**
     * Explodes a group. All windows in the group are unlocked.
     * @param target A window which is a member of the group to be exploded.
     */
    public async explodeGroup(target: WindowIdentity): Promise<void> {
        // NOTE: Since there is currently not a schema to identify a group, this method
        // accepts a window that is a member of the group. Once there is a way of uniquely
        // identifying groups, this can be changed

        // Get the group containing the targetWindow
        const window = this.model.getWindow(target);
        const group = window && window.getSnapGroup();

        if (!group) {
            console.error(`Unable to undock - no group found for window with identity "${target.uuid}/${target.name}"`);
            throw new Error(`Unable to undock - no group found for window with identity "${target.uuid}/${target.name}"`);
        }

        try {
            // Exploding only makes sense if there is more than one window in the group.
            const snappables = group.snappables;
            if (snappables.length > 1) {
                // group.center is recalculated on each call, so we assign it here once and use the value.
                const groupCenter = group.center;

                await Promise.all(snappables.map((snappable: Snappable) => {
                    return snappable.setSnapGroup(new DesktopSnapGroup());
                }));

                await Promise.all(snappables.map((snappable: Snappable) => {
                    // Determine the offset for each window before modifying and window state
                    const offset = PointUtils.scale(PointUtils.difference(groupCenter, snappable.getState().center), EXPLODE_MOVE_SCALE);

                    // Detach snappable from it's previous group, and apply the calculated offset
                    return snappable.applyOffset(offset, snappable.getState().halfSize);
                }));
            }
        } catch (error) {
            console.error(`Unexpected error when undocking group: ${error}`);
            throw new Error(`Unexpected error when undocking group: ${error}`);
        }
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        group.onModified.add(this.validateGroup, this);
        group.onTransform.add(this.snapGroup, this);
        group.onCommit.add(this.applySnapTarget, this);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        group.onModified.remove(this.validateGroup, this);
        group.onTransform.remove(this.snapGroup, this);
        group.onCommit.remove(this.applySnapTarget, this);
    }

    private validateGroup(group: DesktopSnapGroup, modifiedWindow: DesktopWindow): void {
        if (group.windows.includes(modifiedWindow)) {
            // If a validate is already scheduled, postpone it. But no need to trigger a validation.
            this.validateGroups.postpone();
        } else {
            // Window has been removed from group, definitely need to validate.
            this.validateGroups.call(group);
        }
    }

    private validateGroupInternal(group: DesktopSnapGroup): void {
        // Ensure 'group' is still a valid, contiguous group.
        // NOTE: 'modifiedWindow' may no longer exist (if validation is being performed because a window was closed)
        const contiguousWindowSets = this.getContiguousWindows(group.snappables);
        if (contiguousWindowSets.length > 1) {                             // Group is disjointed. Need to split.
            for (const windowsToGroup of contiguousWindowSets.slice(1)) {  // Leave first set as-is. Move others into own groups.
                const newGroup = new DesktopSnapGroup();
                for (const windowToGroup of windowsToGroup) {
                    windowToGroup.setSnapGroup(newGroup);
                }
            }
        }
    }

    private snapGroup(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>): void {
        const groups: ReadonlyArray<DesktopSnapGroup> = this.model.getSnapGroups();
        const snapTarget: SnapTarget|null = this.resolver.getSnapTarget(groups, activeGroup);

        this.validateGroups.postpone();
        this.view.update(activeGroup, snapTarget);
    }

    private async applySnapTarget(activeGroup: DesktopSnapGroup): Promise<void> {
        const groups: ReadonlyArray<DesktopSnapGroup> = this.model.getSnapGroups();
        const snapTarget: SnapTarget|null = this.resolver.getSnapTarget(groups, activeGroup);

        if (snapTarget && snapTarget.validity === eSnapValidity.VALID) {  // SNAP WINDOWS
            if (activeGroup.snappables.length > 1) {
                throw new Error('Cannot snap two groups together');
            }

            // Snap all windows in activeGroup to snapTarget.group
            await snapTarget.activeWindow.applyOffset(snapTarget.snapOffset, snapTarget.halfSize!);

            if (!this.disableDockingOperations) {
                // Dock all windows in activeGroup to snapTarget.group
                await snapTarget.activeWindow.setSnapGroup(snapTarget.group);

                // The active group should now have been removed (since it is empty)
                if (groups.indexOf(activeGroup) >= 0) {
                    console.warn(
                        `Expected group to have been removed, but still exists (${activeGroup.id}: ${activeGroup.windows.map(w => w.getId()).join()})`);
                }
            }
        } else if (activeGroup.length === 1 && !activeGroup.windows[0].getTabGroup()) {  // TAB WINDOWS
            // Check if we can add this window to a (new or existing) tab group
            const activeWindow: DesktopWindow = activeGroup.windows[0] as DesktopWindow;
            await tabService.tabDroppedWindow(activeWindow);
        }

        // Reset view
        this.view.update(null, null);
        this.validateGroups.call(activeGroup);
    }

    private calculateUndockMoveDirection(window: Snappable): Point {
        const group = window.getSnapGroup();
        const totalOffset: Point = {x: 0, y: 0};
        for (const groupedWindow of group.snappables) {
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

    private getContiguousWindows(windows: Snappable[]): Snappable[][] {
        const adjacencyList: Snappable[][] = new Array<Snappable[]>(windows.length);

        // Build adjacency list
        for (let i = 0; i < windows.length; i++) {
            adjacencyList[i] = [];
            for (let j = 0; j < windows.length; j++) {
                if (i !== j && isAdjacent(windows[i], windows[j])) {
                    adjacencyList[i].push(windows[j]);
                }
            }
        }

        // Find all contiguous sets
        const contiguousSets: Snappable[][] = [];
        const unvisited: Snappable[] = windows.slice();

        while (unvisited.length > 0) {
            const visited: Snappable[] = [];
            dfs(unvisited[0], visited);
            contiguousSets.push(visited);
        }

        return contiguousSets;

        function dfs(startWindow: Snappable, visited: Snappable[]) {
            const startIndex = windows.indexOf(startWindow);
            if (visited.includes(startWindow)) {
                return;
            }
            visited.push(startWindow);
            unvisited.splice(unvisited.indexOf(startWindow), 1);
            for (let i = 0; i < adjacencyList[startIndex].length; i++) {
                dfs(adjacencyList[startIndex][i], visited);
            }
        }

        function isAdjacent(win1: Snappable, win2: Snappable) {
            const distance = RectUtils.distance(win1.getState(), win2.getState());
            if (win1.getTabGroup() && win1.getTabGroup() === win2.getTabGroup()) {
                // Special handling for tab groups. When validating, all windows in a tabgroup are
                // assumed to be adjacent to avoid weirdness with hidden windows.
                return true;
            } else if (win1.getState().hidden || win2.getState().hidden) {
                // If a window is not visible it cannot be adjacent to anything. This also allows us
                // to avoid the questionable position tracking for hidden windows.
                return false;
            } else if (distance.border(SnapService.VALIDATE_GROUP_DISTANCE) && Math.abs(distance.maxAbs) > MIN_OVERLAP) {
                // The overlap check ensures that only valid snap configurations are counted
                return true;
            }
            return false;
        }
    }
}
