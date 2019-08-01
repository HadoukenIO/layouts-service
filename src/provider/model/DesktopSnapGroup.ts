import {Signal} from 'openfin-service-signal';

import {WindowDockedEvent, WindowUndockedEvent} from '../../client/snapanddock';
import {CalculatedProperty} from '../snapanddock/utils/CalculatedProperty';
import {Debounced} from '../snapanddock/utils/Debounced';
import {Point, PointUtils} from '../snapanddock/utils/PointUtils';
import {Rectangle} from '../snapanddock/utils/RectUtils';
import {getContiguousEntities} from '../utils/groups';

import {DesktopEntity} from './DesktopEntity';
import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow, EntityState, eTransformType, Mask, ResizeConstraint} from './DesktopWindow';

export class DesktopSnapGroup {
    private static _nextId = 1;

    public static readonly onCreated: Signal<[DesktopSnapGroup]> = new Signal();
    public static readonly onDestroyed: Signal<[DesktopSnapGroup]> = new Signal();

    /**
     * A window property has been changed that may snap the window out of any group that it it's currently in.
     *
     * The service should validate the window, to ensure it's current grouping is still valid.
     *
     * Arguments: (group: DesktopSnapGroup, modifiedWindow: DesktopWindow)
     */
    public readonly onModified: Signal<[DesktopSnapGroup, DesktopWindow]> = new Signal();

    /**
     * Window is being moved/resized, need to check for any snap targets.
     *
     * Arguments: (group: DesktopSnapGroup, type: Mask<eTransformType>)
     */
    public readonly onTransform: Signal<[DesktopSnapGroup, Mask<eTransformType>]> = new Signal();

    /**
     * The move/resize operation (that was signalled through onTransform) has been completed.
     *
     * Any active snap target can now be applied.
     *
     * Arguments: (group: DesktopSnapGroup, type: Mask<eTransformType>)
     */
    public readonly onCommit: Signal<[DesktopSnapGroup, Mask<eTransformType>]> = new Signal();

    /**
     * A window has been added to this group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: DesktopSnapGroup, window: DesktopWindow)
     */
    public readonly onWindowAdded: Signal<[DesktopSnapGroup, DesktopWindow]> = new Signal();

    /**
     * A window has been removed from this group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: DesktopSnapGroup, window: DesktopWindow)
     */
    public readonly onWindowRemoved: Signal<[DesktopSnapGroup, DesktopWindow]> = new Signal();


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

    private _validateGroup: Debounced<() => Promise<void>, DesktopSnapGroup, []>;

    private _resizeConstraintsSuspended: boolean;

    constructor() {
        this._id = DesktopSnapGroup._nextId++;
        this._entities = [];
        this._windows = [];
        this.rootWindow = null;
        this._resizeConstraintsSuspended = false;

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
            const nonTrivialBefore = this.isNonTrivial();

            // Remove window from it's previous group
            const prevGroup = (window.snapGroup === this) ? window.prevGroup : window.snapGroup;
            if (prevGroup) {
                prevGroup.removeWindow(window);
            }

            // Add listeners to window
            window.onModified.add(this.onWindowModified, this);
            window.onTransform.add(this.onWindowTransform, this);
            window.onCommit.add(this.onWindowCommit, this);
            window.onTabGroupChanged.add(this.onWindowTabGroupChanged, this);
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

            const nonTrivialAfter = this.isNonTrivial();

            if (nonTrivialBefore && nonTrivialAfter) {
                window.sendEvent<WindowDockedEvent>({type: 'window-docked'});
            } else if (!nonTrivialBefore && nonTrivialAfter) {
                this._windows.forEach(groupWindow => groupWindow.sendEvent<WindowDockedEvent>({type: 'window-docked'}));
            } else if (nonTrivialBefore && !nonTrivialAfter) {
                // This case can occur if the tabstrip window gets added to the snap group after the individual tab windows
                this._windows.forEach(groupWindow => groupWindow.sendEvent<WindowUndockedEvent>({type: 'window-undocked'}));
            }

            // Inform service of addition
            this.onWindowAdded.emit(this, window);
        }
    }

    public validate(): Promise<void> {
        return this._validateGroup.call();
    }

    public isNonTrivial(): boolean {
        return this._entities.length >= 2;
    }

    /**
     * This allows us to temporarily remove resize constraints, which causes problems when moving a snap group when display
     * scaling is enabled
     */
    public suspendResizeConstraints(): void {
        if (this._windows.length > 1 && !this._resizeConstraintsSuspended) {
            const nullConstraint: ResizeConstraint = {resizableMin: true, resizableMax: true, minSize: 0, maxSize: Number.MAX_SAFE_INTEGER};
            const nullConstraints: Point<ResizeConstraint> = {x: nullConstraint, y: nullConstraint};

            this._resizeConstraintsSuspended = true;

            for (const window of this._windows) {
                // We refresh here, otherwise we may not know about constraint changes made by the app via the runtime API, which
                // would prevent applyOverride properly unsetting them
                window.refresh().then(() => {
                    if (this._resizeConstraintsSuspended) {
                        window.applyOverride('resizeConstraints', nullConstraints);
                    }
                });
            }
        }
    }

    public restoreResizeConstraints(): void {
        if (this._resizeConstraintsSuspended) {
            for (const window of this._windows) {
                window.resetOverride('resizeConstraints');
            }

            this._resizeConstraintsSuspended = false;
        }
    }

    public async applyOffset(offset: Point): Promise<void> {
        if (this.rootWindow!.currentState.state === 'minimized') {
            return DesktopWindow.transaction(this.windows, async (windows) => {
                await Promise.all(windows.map(window => window.applyOffset(offset)));
            });
        } else {
            return this.rootWindow!.applyOffset(offset);
        }
    }

    private async validateGroupInternal(): Promise<void> {
        // Ensure 'group' is still a valid, contiguous group.
        const contiguousWindowSets = getContiguousEntities(this.entities);
        if (contiguousWindowSets.length > 1) {                      // Group is disjointed. Need to split.
            await Promise.all(contiguousWindowSets.slice(1).map(set => {  // Leave first set as-is. Move others into own groups.
                const newGroup = new DesktopSnapGroup();
                return Promise.all(set.map(window => window.setSnapGroup(newGroup)));
            }));
        }
    }

    private removeWindow(window: DesktopWindow): void {
        const index: number = this._windows.indexOf(window);

        if (index >= 0) {
            const nonTrivialBefore = this.isNonTrivial();

            this._windows.splice(index, 1);
            this.buildEntities();

            window.onModified.remove(this.onWindowModified, this);
            window.onTransform.remove(this.onWindowTransform, this);
            window.onCommit.remove(this.onWindowCommit, this);
            window.onTabGroupChanged.remove(this.onWindowTabGroupChanged, this);
            window.onTeardown.remove(this.onWindowTeardown, this);

            // Root may now have changed
            this.checkRoot();

            // Will need to re-calculate cached properties
            this._localBounds.markStale();

            const nonTrivialAfter = this.isNonTrivial();

            // Inform window of removal
            // Note that client API only considers windows to belong to a group if it contains two or more windows
            if (nonTrivialBefore && nonTrivialAfter) {
                if (window.isReady) {
                    window.sendEvent<WindowUndockedEvent>({type: 'window-undocked'});
                }
            } else if (nonTrivialBefore && !nonTrivialAfter) {
                if (window.isReady) {
                    window.sendEvent<WindowUndockedEvent>({type: 'window-undocked'});
                }

                this._windows.forEach(groupWindow => {
                    if (groupWindow.isReady) {
                        groupWindow.sendEvent<WindowUndockedEvent>({type: 'window-undocked'});
                    }
                });
            } else if (!nonTrivialBefore && nonTrivialAfter) {
                // This case can occur if the tabstrip window gets removed from the snap group before the individual tab windows
                this._windows.forEach(groupWindow => {
                    if (groupWindow.isReady) {
                        groupWindow.sendEvent<WindowDockedEvent>({type: 'window-docked'});
                    }
                });
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
            const tabGroup: DesktopTabGroup|null = window.tabGroup;
            const entity = tabGroup ? tabGroup : window;

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

    private onWindowTabGroupChanged(window: DesktopWindow) {
        const nonTrivialBefore = this.isNonTrivial();
        this.buildEntities();
        this.checkRoot();
        const nonTrivialAfter = this.isNonTrivial();

        if (!nonTrivialBefore && nonTrivialAfter) {
            this._windows.forEach(groupWindow => groupWindow.sendEvent<WindowDockedEvent>({type: 'window-docked'}));
        } else if (nonTrivialBefore && !nonTrivialAfter) {
            this._windows.forEach(groupWindow => groupWindow.sendEvent<WindowUndockedEvent>({type: 'window-undocked'}));
        }
    }

    private async onWindowTeardown(window: DesktopWindow): Promise<void> {
        const group: DesktopSnapGroup = window.snapGroup;

        // Ensure window is removed from it's snap group, so that the group doesn't contain any de-registered or non-existent windows.
        group.removeWindow(window);
    }

    private calculateProperties(): Rectangle {
        let windows: DesktopWindow[] = this._windows;
        let numWindows: number = windows.length;

        if (numWindows > 1) {
            windows = windows.filter((window: DesktopWindow) => {
                return !window.currentState.hidden;
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
