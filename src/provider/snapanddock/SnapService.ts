import {ConfigStore} from '../main';
import {DesktopEntity} from '../model/DesktopEntity';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {DesktopWindow, WindowIdentity} from '../model/DesktopWindow';
import {Target} from '../WindowHandler';

import {EXPLODE_MOVE_SCALE, UNDOCK_MOVE_DISTANCE} from './Constants';
import {Resolver, SnapTarget} from './Resolver';
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
    private _resolver: Resolver;

    private _model: DesktopModel;
    private _config: ConfigStore;

    constructor(model: DesktopModel, config: ConfigStore) {
        this._model = model;
        this._config = config;
        this._resolver = new Resolver(config);

        // Register global undock hotkey listener
        fin.GlobalHotkey.register('CommandOrControl+Shift+U', async () => {
            let focusedWindow = await (<any>fin.System).getFocusedWindow();
            
            // If none of the OpenFin windows is focused, check external windows.
            if (!focusedWindow) {
                focusedWindow = await (<any>fin.System).getFocusedExternalWindow();

                if (focusedWindow) {
                    focusedWindow.name = focusedWindow.uuid;
                    focusedWindow.isExternalWindow = true;
                }
            }

            if (focusedWindow !== null && model.getWindow(focusedWindow)) {
                console.log('Global hotkey invoked on window', focusedWindow);
                this.undock(focusedWindow);
            }
        }).catch(console.error);
    }

    public async undock(target: WindowIdentity): Promise<void> {
        const window: DesktopWindow|null = this._model.getWindow(target);

        if (window && window.snapGroup.isNonTrivial()) {
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

                // We leave one of the entities in the original snapGroup since we would just be moving it from one solo group to another.
                // Chose the first because saved a couple of characters in the code, but really doesn't matter which is left behind.
                await Promise.all(entities.slice(1).map((entity: DesktopEntity) => {
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

    public async applySnapTarget(snapTarget: SnapTarget): Promise<void> {
        if (snapTarget.valid) {  // SNAP WINDOWS
            const activeGroup = snapTarget.activeWindow.snapGroup;

            if (activeGroup.isNonTrivial()) {
                throw new Error('Cannot snap two groups together');
            }

            // Snap all windows in activeGroup to snapTarget.group
            await snapTarget.activeWindow.applyOffset(snapTarget.offset, snapTarget.halfSize!);

            const canDockActive: boolean = this._config.query(snapTarget.activeWindow.scope).features.dock;
            const canDockTarget: boolean = snapTarget.targetGroup.windows.every(window => this._config.query(window.scope).features.dock);
            if (canDockActive && canDockTarget) {
                // Dock all windows in activeGroup to snapTarget.group
                await snapTarget.activeWindow.setSnapGroup(snapTarget.targetGroup);

                // The active group should now have been removed (since it is empty)
                if (this._model.snapGroups.indexOf(activeGroup) >= 0) {
                    console.warn(`Expected group to have been removed, but still exists (${activeGroup.id}: ${activeGroup.windows.map(w => w.id).join()})`);
                }
            }
        }
        snapTarget.targetGroup.validate();
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
}
