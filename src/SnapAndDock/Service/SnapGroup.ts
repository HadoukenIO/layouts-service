import {Signal1, Signal2} from './Signal';
import {eTransformType, Mask, SnapWindow, WindowState} from './SnapWindow';
import {CalculatedProperty} from './utils/CalculatedProperty';
import {Point} from './utils/PointUtils';

/**
 * Key-value store for saving the state of each window before it was added to the tab group.
 *
 * When a window gets converted into a tab, the service will have to override most of it's properties, but we want to
 * be able to restore each window to it's original state when you "pop" or "tear" the tab out of the group.
 *
 * Whilst a tab is within a group, this will be the only place that has the original pre-tab state of the window. The
 * SnapWindow state will all reflect the size/appearance of the tabbed version of the window.
 */
type TabData = {
    [id: string]: WindowState
};

interface TabState {
    tabBar: SnapWindow;

    /**
     * Maps SnapWindow ID's to the cached state for that window.
     *
     * The tab bar is a SnapWindow the same as any other window in the group, but that window will not appear in this
     * map, as we won't ever need to "un-tab" or "restore" that window.
     */
    previousState: TabData;
}

export class SnapGroup {
    private static nextId = 1;

    /**
     * A window property has been changed that may snap the window out of any group that it it's currently in.
     *
     * The service should validate the window, to ensure it's current grouping is still valid.
     *
     * Arguments: (group: SnapGroup, modifiedWindow: SnapWindow)
     */
    readonly onModified: Signal2<SnapGroup, SnapWindow> = new Signal2();

    /**
     * Window is being moved/resized, need to check for any snap targets.
     *
     * Arguments: (group: SnapGroup, type: Mask<eTransformType>)
     */
    readonly onTransform: Signal2<SnapGroup, Mask<eTransformType>> = new Signal2();

    /**
     * The move/resize operation (that was signalled through onTransform) has been completed.
     *
     * Any active snap target can now be applied.
     *
     * Arguments: (group: SnapGroup)
     */
    readonly onCommit: Signal1<SnapGroup> = new Signal1();

    /**
     * A window has been added to this group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: SnapGroup, window: SnapWindow)
     */
    readonly onWindowAdded: Signal2<SnapGroup, SnapWindow> = new Signal2();

    /**
     * A window has been removed from this group.
     *
     * Signal will be fired AFTER all state updates.
     *
     * Arguments: (group: SnapGroup, window: SnapWindow)
     */
    readonly onWindowRemoved: Signal2<SnapGroup, SnapWindow> = new Signal2();


    // NOTE: The co-ordinates used by _origin and _halfSize use the center of the root window as the origin.
    private _origin: CalculatedProperty<Point>;
    private _halfSize: CalculatedProperty<Point>;

    private _id: number;
    private _windows: SnapWindow[];

    private rootWindow: SnapWindow|null;

    /**
     * If this is non-null then the windows in this group are tabbed, and so have some special behaviour.
     *
     * A group with n tabs will contain n+1 windows - the n applications that the user has "tabbed" together, amd an
     * additional window that is created by the Snap & Dock service. This window acts as the tab bar - it will be a
     * SnapWindow same as any other window, and other windows will also be able to snap to it.
     */
    private tabData: TabData|null;

    constructor() {
        this._id = SnapGroup.nextId++;
        this._windows = [];
        this.rootWindow = null;
        this.tabData = null;

        const refreshFunc = this.calculateProperties.bind(this);
        this._origin = new CalculatedProperty(refreshFunc);
        this._halfSize = new CalculatedProperty(refreshFunc);
    }

    get id(): number {
        return this._id;
    }

    get origin(): Readonly<Point> {
        return this._origin.value;
    }

    get halfSize(): Readonly<Point> {
        return this._halfSize.value;
    }

    get center(): Point {
        if (this.rootWindow) {
            const origin: Point = this._origin.value;
            const rootCenter: Point = this.rootWindow!.getState().center;

            return {x: rootCenter.x + origin.x, y: rootCenter.y + origin.y};
        } else {
            return {x: 0, y: 0};
        }
    }

    get length(): number {
        return this._windows.length;
    }

    get isTabGroup(): boolean {
        return this.tabData !== null;
    }

    get windows(): SnapWindow[] {
        return this._windows.slice();
    }

    addWindow(window: SnapWindow): void {
        if (!this._windows.includes(window)) {
            // Remove window from it's previous group
            const prevGroup = window.getGroup();
            if (prevGroup) {
                prevGroup.removeWindow(window);
            }

            // Add listeners to window
            window.onModified.add(this.onWindowModified, this);
            window.onTransform.add(this.onWindowTransform, this);
            window.onCommit.add(this.onWindowCommit, this);
            window.onClose.add(this.removeWindow, this);

            // Setup hierarchy
            this._windows.push(window);
            this.checkRoot();
            if (window.getGroup() !== this) {
                window.setGroup(this);
            }

            // Will need to re-calculate cached properties
            this._origin.markStale();
            this._halfSize.markStale();

            this.onWindowAdded.emit(this, window);
        }
    }

    private removeWindow(window: SnapWindow): void {
        const index: number = this._windows.indexOf(window);

        if (index >= 0) {
            this._windows.splice(index, 1);
            window.onModified.remove(this.onWindowModified, this);
            window.onTransform.remove(this.onWindowTransform, this);
            window.onCommit.remove(this.onWindowCommit, this);
            window.onClose.remove(this.removeWindow, this);

            // Root may now have changed
            this.checkRoot();

            // Will need to re-calculate cached properties
            this._origin.markStale();
            this._halfSize.markStale();

            this.onWindowRemoved.emit(this, window);
        }
    }

    /**
     * Ensures the root is valid. If the group is empty, the root will be null.
     */
    private checkRoot(): void {
        const root = this._windows[0] || null;
        if (this.rootWindow !== root) {
            this.rootWindow = root;

            // Since these are measured relative to the root window, they will need updating
            this._origin.markStale();
            this._halfSize.markStale();
        }
    }

    private onWindowModified(window: SnapWindow): void {
        this.onModified.emit(this, window);
    }

    private onWindowTransform(window: SnapWindow, type: Mask<eTransformType>): void {
        if (type === eTransformType.MOVE) {
            // When a grouped window is moved, all windows in the group will fire a move event.
            // We want to filter these to ensure the group only fires onTransform once
            if (window === this.rootWindow) {
                this.onTransform.emit(this, type);
            }
        } else {
            // If a window is resized, that event will only ever fire from that one window. Safe to re-broadcast at the group level.
            this.onTransform.emit(this, type);
        }

        if ((type & eTransformType.RESIZE) !== 0) {
            // The group's bounding box MAY have changed (if the resized window was, or is now, on the edge of the group)
            // No way to tell for sure, so will need to re-calculate bounds regardless, to be safe.
            this._origin.markStale();
            this._halfSize.markStale();
        }
    }

    private onWindowCommit(window: SnapWindow): void {
        this.onCommit.emit(this);
    }

    private onWindowClosed(window: SnapWindow): void {
        this.removeWindow(window);
    }

    private calculateProperties(): void {
        const windows: SnapWindow[] = this._windows;
        const numWindows: number = windows.length;

        if (numWindows === 0) {
            this._origin.updateValue({x: 0, y: 0});
            this._halfSize.updateValue({x: 0, y: 0});
        } else if (numWindows === 1) {
            this._origin.updateValue({x: 0, y: 0});
            this._halfSize.updateValue({...this.rootWindow!.getState().halfSize});
        } else {
            let state: WindowState = windows[0].getState();
            const min: Point = {x: state.center.x - state.halfSize.x, y: state.center.y - state.halfSize.y};
            const max: Point = {x: state.center.x + state.halfSize.x, y: state.center.y + state.halfSize.y};

            for (let i = 1; i < numWindows; i++) {
                state = windows[i].getState();

                min.x = Math.min(min.x, state.center.x - state.halfSize.x);
                min.y = Math.min(min.y, state.center.y - state.halfSize.y);
                max.x = Math.max(max.x, state.center.x + state.halfSize.x);
                max.y = Math.max(max.y, state.center.y + state.halfSize.y);
            }

            const rootPosition: Point = this.rootWindow!.getState().center;
            this._origin.updateValue({x: ((min.x + max.x) / 2) - rootPosition.x, y: ((min.y + max.y) / 2) - rootPosition.y});
            this._halfSize.updateValue({x: (max.x - min.x) / 2, y: (max.y - min.y) / 2});
        }
    }
}
