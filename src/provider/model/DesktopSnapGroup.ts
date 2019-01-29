import {Signal1, Signal2} from '../Signal';
import {MIN_OVERLAP} from '../snapanddock/Constants';
import {CalculatedProperty} from '../snapanddock/utils/CalculatedProperty';
import {Debounced} from '../snapanddock/utils/Debounced';
import {Point, PointUtils} from '../snapanddock/utils/PointUtils';
import {Rectangle} from '../snapanddock/utils/RectUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';

import {DesktopEntity} from './DesktopEntity';
import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow, EntityState, eTransformType, Mask, WindowMessages} from './DesktopWindow';

export class DesktopSnapGroup {
    private static _nextId = 1;

    public static readonly onCreated: Signal1<DesktopSnapGroup> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopSnapGroup> = new Signal1();

    /**
     * A window property has been changed that may snap the window out of any group that it it's currently in.
     *
     * The service should validate the window, to ensure it's current grouping is still valid.
     *
     * Arguments: (group: DesktopSnapGroup, modifiedWindow: DesktopWindow)
     */
    public readonly onModified: Signal2<DesktopSnapGroup, DesktopWindow> = new Signal2();

    /**
     * Window is being moved/resized, need to check for any snap targets.
     *
     * Arguments: (group: DesktopSnapGroup, type: Mask<eTransformType>)
     */
    public readonly onTransform: Signal2<DesktopSnapGroup, Mask<eTransformType>> = new Signal2();

    /**
     * The move/resize operation (that was signalled through onTransform) has been completed.
     *
     * Any active snap target can now be applied.
     *
     * Arguments: (group: DesktopSnapGroup, type: Mask<eTransformType>)
     */
    public readonly onCommit: Signal2<DesktopSnapGroup, Mask<eTransformType>> = new Signal2();

    /**
     * A window has been added to this group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: DesktopSnapGroup, window: DesktopWindow)
     */
    public readonly onWindowAdded: Signal2<DesktopSnapGroup, DesktopWindow> = new Signal2();

    /**
     * A window has been removed from this group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: DesktopSnapGroup, window: DesktopWindow)
     */
    public readonly onWindowRemoved: Signal2<DesktopSnapGroup, DesktopWindow> = new Signal2();


    /**
     * This stores the bounds of the overall snap group. This is stored in "local" co-ordinates, relative to
     * `rootWindow.center`. This ensures that we only need to re-calculate these bounds whenever windows are added,
     * removed or resized - rather than all of those, plus 'moved'.
     *
     * A util is used to lazily perform the re-calculation only when required.
     */
    private _localBounds: CalculatedProperty<Rectangle>;

    private _id: number;
    private _entities: DesktopEntity[];
    private _windows: DesktopWindow[];

    private rootWindow: DesktopWindow|null;

    private _validateGroup: Debounced<() => void, DesktopSnapGroup, []>;

    constructor() {
        this._id = DesktopSnapGroup._nextId++;
        this._entities = [];
        this._windows = [];
        this.rootWindow = null;

        const refreshFunc = this.calculateProperties.bind(this);
        this._localBounds = new CalculatedProperty<Rectangle>(refreshFunc);

        this._validateGroup = new Debounced(this.validateGroupInternal, this);

        this.onModified.add(this.onGroupModified.bind(this));

        DesktopSnapGroup.onCreated.emit(this);
    }

    public get id(): number {
        return this._id;
    }

    public get origin(): Readonly<Point> {
        return this._localBounds.value.center;
    }

    public get halfSize(): Readonly<Point> {
        return this._localBounds.value.halfSize;
    }

    public get center(): Point {
        if (this.rootWindow) {
            const origin: Point = this._localBounds.value.center;
            const rootCenter: Point = this.rootWindow!.currentState.center;

            return {x: rootCenter.x + origin.x, y: rootCenter.y + origin.y};
        } else {
            return {x: 0, y: 0};
        }
    }

    public get length(): number {
        return this._windows.length;
    }

    public get entities(): DesktopEntity[] {
        return this._entities.slice();
    }

    public get windows(): DesktopWindow[] {
        return this._windows.slice();
    }

    public addWindow(window: DesktopWindow): void {
        if (!this._windows.includes(window)) {
            // Remove window from it's previous group
            const prevGroup = (window.snapGroup === this) ? window.prevGroup : window.snapGroup;
            if (prevGroup) {
                prevGroup.removeWindow(window);
            }

            // Add listeners to window
            window.onModified.add(this.onWindowModified, this);
            window.onTransform.add(this.onWindowTransform, this);
            window.onCommit.add(this.onWindowCommit, this);
            window.onTeardown.add(this.onWindowTeardown, this);

            // Setup hierarchy
            this._windows.push(window);
            this.buildEntities();
            this.checkRoot();
            if (window.snapGroup !== this) {
                window.setSnapGroup(this);
            }

            // Will need to re-calculate cached properties
            this._localBounds.markStale();

            // Inform window of addition
            // Note that client API only considers windows to belong to a group if it contains two or more windows
            if (this._windows.length >= 2) {
                window.sendMessage(WindowMessages.JOIN_SNAP_GROUP, {});
            }

            // Inform service of addition
            this.onWindowAdded.emit(this, window);
        }
    }

    public validate(): void {
        this._validateGroup.call();
    }

    private validateGroupInternal(): void {
        // Ensure 'group' is still a valid, contiguous group.
        const contiguousWindowSets = this.getContiguousEntities(this.entities);
        if (contiguousWindowSets.length > 1) {                             // Group is disjointed. Need to split.
            for (const windowsToGroup of contiguousWindowSets.slice(1)) {  // Leave first set as-is. Move others into own groups.
                const newGroup = new DesktopSnapGroup();
                for (const windowToGroup of windowsToGroup) {
                    windowToGroup.setSnapGroup(newGroup);
                }
            }
        }
    }

    private getContiguousEntities(entities: DesktopEntity[]): DesktopEntity[][] {
        const adjacencyList: DesktopEntity[][] = new Array<DesktopEntity[]>(entities.length);

        // Build adjacency list
        for (let i = 0; i < entities.length; i++) {
            adjacencyList[i] = [];
            for (let j = 0; j < entities.length; j++) {
                if (i !== j && isAdjacent(entities[i], entities[j])) {
                    adjacencyList[i].push(entities[j]);
                }
            }
        }

        // Find all contiguous sets
        const contiguousSets: DesktopEntity[][] = [];
        const unvisited: DesktopEntity[] = entities.slice();

        while (unvisited.length > 0) {
            const visited: DesktopEntity[] = [];
            depthFirstSearch(unvisited[0], visited);
            contiguousSets.push(visited);
        }

        return contiguousSets;

        function depthFirstSearch(startWindow: DesktopEntity, visited: DesktopEntity[]) {
            const startIndex = entities.indexOf(startWindow);
            if (visited.includes(startWindow)) {
                return;
            }
            visited.push(startWindow);
            unvisited.splice(unvisited.indexOf(startWindow), 1);
            for (let i = 0; i < adjacencyList[startIndex].length; i++) {
                depthFirstSearch(adjacencyList[startIndex][i], visited);
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
            } else if (distance.border(0) && Math.abs(distance.maxAbs) > MIN_OVERLAP) {
                // The overlap check ensures that only valid snap configurations are counted
                return true;
            }
            return false;
        }
    }

    private removeWindow(window: DesktopWindow): void {
        const index: number = this._windows.indexOf(window);

        if (index >= 0) {
            this._windows.splice(index, 1);
            this.buildEntities();

            window.onModified.remove(this.onWindowModified, this);
            window.onTransform.remove(this.onWindowTransform, this);
            window.onCommit.remove(this.onWindowCommit, this);

            // Root may now have changed
            this.checkRoot();

            // Will need to re-calculate cached properties
            this._localBounds.markStale();

            // Inform window of removal
            // Note that client API only considers windows to belong to a group if it contains two or more windows
            if (this._windows.length > 0 && window.isReady) {
                window.sendMessage(WindowMessages.LEAVE_SNAP_GROUP, {});
            }

            // Inform the service that the group has been modified
            this.onModified.emit(this, window);

            // Inform service of removal
            this.onWindowRemoved.emit(this, window);

            if (this._windows.length === 0) {
                DesktopSnapGroup.onDestroyed.emit(this);
            }
        }
    }

    private buildEntities(): void {
        const entities: DesktopEntity[] = this._entities;

        entities.length = 0;
        this._windows.forEach((window: DesktopWindow) => {
            let entity: DesktopEntity;
            const tabGroup: DesktopTabGroup|null = window.tabGroup;

            if (tabGroup && tabGroup.tabs.length > 1) {
                entity = tabGroup;
            } else {
                entity = window;
            }

            if (!entities.includes(entity)) {
                entities.push(entity);
            }
        });
    }

    /**
     * Ensures the root is valid. If the group is empty, the root will be null.
     */
    private checkRoot(): void {
        let root = this._windows[0] || null;
        const tabGroup: DesktopTabGroup|null = root && root.tabGroup;

        // If the root window becomes hidden the group center will stop updating.
        // Tabbed windows are likely to be hidden a large amount of the time, so prefer the tabstrip window as the root.
        if (tabGroup && tabGroup.tabs.length >= 2) {
            root = tabGroup.window;
        }

        if (this.rootWindow !== root) {
            this.rootWindow = root;

            // Since these are measured relative to the root window, they will need updating
            this._localBounds.markStale();
        }
    }

    private onGroupModified(group: DesktopSnapGroup, window: DesktopWindow): void {
        if (this.windows.includes(window)) {
            this._validateGroup.postpone();
        } else {
            this._validateGroup.call();
        }
    }

    private onWindowModified(window: DesktopWindow): void {
        this._localBounds.markStale();
        this.onModified.emit(this, window);
    }

    private onWindowTransform(window: DesktopWindow, type: Mask<eTransformType>): void {
        this._validateGroup.postpone();

        if (type === eTransformType.MOVE) {
            // When a grouped window is moved, all windows in the group will fire a move event.
            // We want to filter these to ensure the group only fires onTransform once
            this.onTransform.emit(this, type);
        } else {
            // If a window is resized, that event will only ever fire from that one window. Safe to re-broadcast at the group level.
            this.onTransform.emit(this, type);
        }

        if ((type & eTransformType.RESIZE) !== 0) {
            // The group's bounding box MAY have changed (if the resized window was, or is now, on the edge of the group)
            // No way to tell for sure, so will need to re-calculate bounds regardless, to be safe.
            this._localBounds.markStale();
        }
    }

    private onWindowCommit(window: DesktopWindow, type: Mask<eTransformType>): void {
        this.onCommit.emit(this, type);
    }

    private async onWindowTeardown(window: DesktopWindow): Promise<void> {
        const group: DesktopSnapGroup = window.snapGroup;

        // Ensure window is removed from it's snap group, so that the group doesn't contain any de-registered or non-existent windows.
        group.removeWindow(window);
    }

    private calculateProperties(): Rectangle {
        let windows: DesktopWindow[] = this._windows;
        let numWindows: number = windows.length;

        if (windows.length > 1) {
            windows = windows.filter((window: DesktopWindow) => {
                const state = window.currentState;
                return !state.hidden && state.state === 'normal';
            });
            numWindows = windows.length;
        }

        if (numWindows === 0) {
            return {center: {x: 0, y: 0}, halfSize: {x: 0, y: 0}};
        } else if (numWindows === 1) {
            return {center: {x: 0, y: 0}, halfSize: PointUtils.clone(this.rootWindow!.currentState.halfSize)};
        } else {
            let state: EntityState = windows[0].currentState;
            const min: Point = {x: state.center.x - state.halfSize.x, y: state.center.y - state.halfSize.y};
            const max: Point = {x: state.center.x + state.halfSize.x, y: state.center.y + state.halfSize.y};

            for (let i = 1; i < numWindows; i++) {
                state = windows[i].currentState;

                min.x = Math.min(min.x, state.center.x - state.halfSize.x);
                min.y = Math.min(min.y, state.center.y - state.halfSize.y);
                max.x = Math.max(max.x, state.center.x + state.halfSize.x);
                max.y = Math.max(max.y, state.center.y + state.halfSize.y);
            }

            const rootPosition: Point = this.rootWindow!.currentState.center;
            return {
                center: {x: ((min.x + max.x) / 2) - rootPosition.x, y: ((min.y + max.y) / 2) - rootPosition.y},
                halfSize: {x: (max.x - min.x) / 2, y: (max.y - min.y) / 2}
            };
        }
    }
}
