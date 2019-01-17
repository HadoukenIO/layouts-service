import {ConfigStore} from '../main';
import {DesktopEntity} from '../model/DesktopEntity';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopWindow, eTransformType, Mask, WindowIdentity} from '../model/DesktopWindow';
import {Target} from '../WindowHandler';

import {EXPLODE_MOVE_SCALE, MIN_OVERLAP, UNDOCK_MOVE_DISTANCE} from './Constants';
import {Resolver, SnapTarget} from './Resolver';
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
    target: Target|null;
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

    private _resolver: Resolver;

    private _model: DesktopModel;

    private _validateGroups: Debounced<(group: DesktopSnapGroup) => void, SnapService, [DesktopSnapGroup]>;

    constructor(model: DesktopModel, config: ConfigStore) {
        this._model = model;
        this._resolver = new Resolver(config);
        this._validateGroups = new Debounced(this.validateGroupInternal, this);

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
        const window: DesktopWindow|null = this._model.getWindow(target);

        // Do nothing for tabbed windows until tab/snap is properly integrated
        if (window && window.snapGroup.entities.length > 1) {
            const entity: DesktopEntity = window.tabGroup || window;

            try {
                // Calculate undock offset
                const offset = this.calculateUndockMoveDirection(entity);

                if (offset.x || offset.y) {
                    offset.x = Math.sign(offset.x) * UNDOCK_MOVE_DISTANCE;
                    offset.y = Math.sign(offset.y) * UNDOCK_MOVE_DISTANCE;
                } else {
                    offset.x = offset.y = UNDOCK_MOVE_DISTANCE;
                }

                // Move window to it's own group, whilst applying offset
                const group = new DesktopSnapGroup();
                await entity.setSnapGroup(group);
                await entity.applyOffset(offset, entity.currentState.halfSize);
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
        const window = this._model.getWindow(target);
        const group = window && window.snapGroup;

        if (!group) {
            console.error(`Unable to undock - no group found for window with identity "${target.uuid}/${target.name}"`);
            throw new Error(`Unable to undock - no group found for window with identity "${target.uuid}/${target.name}"`);
        }

        try {
            // Exploding only makes sense if there is more than one window in the group.
            const entities = group.entities;
            if (entities.length > 1) {
                // group.center is recalculated on each call, so we assign it here once and use the value.
                const groupCenter = group.center;

                await Promise.all(entities.map((entity: DesktopEntity) => {
                    return entity.setSnapGroup(new DesktopSnapGroup());
                }));

                await Promise.all(entities.map((entity: DesktopEntity) => {
                    // Determine the offset for each window before modifying and window state
                    const offset = PointUtils.scale(PointUtils.difference(groupCenter, entity.currentState.center), EXPLODE_MOVE_SCALE);

                    // Detach entity from it's previous group, and apply the calculated offset
                    return entity.applyOffset(offset, entity.currentState.halfSize);
                }));
            }
        } catch (error) {
            console.error(`Unexpected error when undocking group: ${error}`);
            throw new Error(`Unexpected error when undocking group: ${error}`);
        }
    }

    public getTarget(activeGroup: DesktopSnapGroup): SnapTarget|null {
        return this._resolver.getSnapTarget(this._model.snapGroups, activeGroup);
    }

    public applySnapTarget(snapTarget: SnapTarget): void {
        if (snapTarget.valid) {  // SNAP WINDOWS
            const activeGroup = snapTarget.activeWindow.snapGroup;

            if (activeGroup.entities.length > 1) {
                throw new Error('Cannot snap two groups together');
            }

            // Snap all windows in activeGroup to snapTarget.group
            snapTarget.activeWindow.applyOffset(snapTarget.offset, snapTarget.halfSize!);

            if (!this.disableDockingOperations) {
                // Dock all windows in activeGroup to snapTarget.group
                snapTarget.activeWindow.setSnapGroup(snapTarget.group);

                // The active group should now have been removed (since it is empty)
                if (this._model.snapGroups.indexOf(activeGroup) >= 0) {
                    console.warn(`Expected group to have been removed, but still exists (${activeGroup.id}: ${activeGroup.windows.map(w => w.id).join()})`);
                }
            }
        }

        this._validateGroups.call(snapTarget.group);
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        group.onModified.add(this.onGroupModified, this);
        group.onTransform.add(this.onGroupTransform, this);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        group.onModified.remove(this.onGroupModified, this);
        group.onTransform.remove(this.onGroupTransform, this);
    }

    private onGroupModified(group: DesktopSnapGroup, modifiedWindow: DesktopWindow): void {
        if (group.windows.includes(modifiedWindow)) {
            // If a validate is already scheduled, postpone it. But no need to trigger a validation.
            this._validateGroups.postpone();
        } else {
            // Window has been removed from group, definitely need to validate.
            this._validateGroups.call(group);
        }
    }

    private onGroupTransform(group: DesktopSnapGroup, type: Mask<eTransformType>): void {
        this._validateGroups.postpone();
    }

    private validateGroupInternal(group: DesktopSnapGroup): void {
        // Ensure 'group' is still a valid, contiguous group.
        // NOTE: 'modifiedWindow' may no longer exist (if validation is being performed because a window was closed)
        const contiguousWindowSets = this.getContiguousWindows(group.entities);
        if (contiguousWindowSets.length > 1) {                             // Group is disjointed. Need to split.
            for (const windowsToGroup of contiguousWindowSets.slice(1)) {  // Leave first set as-is. Move others into own groups.
                const newGroup = new DesktopSnapGroup();
                for (const windowToGroup of windowsToGroup) {
                    windowToGroup.setSnapGroup(newGroup);
                }
            }
        }
    }

    private calculateUndockMoveDirection(window: DesktopEntity): Point {
        const group = window.snapGroup;
        const totalOffset: Point = {x: 0, y: 0};
        for (const groupedWindow of group.entities) {
            // Exclude window being unsnapped
            if (groupedWindow !== window) {
                const distance: MeasureResult = RectUtils.distance(window.currentState, groupedWindow.currentState);
                if (distance.minAbs === 0 && distance.min < 0) {
                    // The x and y at the end are intentionally swapped. This makes sure that each adjoining window will only cause a move on a single axis.
                    totalOffset.x = totalOffset.x + Math.sign((window.currentState.center.x - groupedWindow.currentState.center.x) * Math.abs(distance.y));
                    totalOffset.y = totalOffset.y + Math.sign((window.currentState.center.y - groupedWindow.currentState.center.y) * Math.abs(distance.x));
                }
            }
        }
        return totalOffset;
    }

    private getContiguousWindows(windows: DesktopEntity[]): DesktopEntity[][] {
        const adjacencyList: DesktopEntity[][] = new Array<DesktopEntity[]>(windows.length);

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
        const contiguousSets: DesktopEntity[][] = [];
        const unvisited: DesktopEntity[] = windows.slice();

        while (unvisited.length > 0) {
            const visited: DesktopEntity[] = [];
            dfs(unvisited[0], visited);
            contiguousSets.push(visited);
        }

        return contiguousSets;

        function dfs(startWindow: DesktopEntity, visited: DesktopEntity[]) {
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

        function isAdjacent(win1: DesktopEntity, win2: DesktopEntity) {
            const distance = RectUtils.distance(win1.currentState, win2.currentState);
            if (win1.tabGroup && win1.tabGroup === win2.tabGroup) {
                // Special handling for tab groups. When validating, all windows in a tabgroup are
                // assumed to be adjacent to avoid weirdness with hidden windows.
                return true;
            } else if (win1.currentState.hidden || win2.currentState.hidden) {
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
