import {Signal1, Signal2} from './Signal';
import {SnapGroup} from './SnapGroup';
import {p} from './utils/async';
import {isWin10} from './utils/platform';
import {Point, PointUtils} from './utils/PointUtils';
import {Rectangle} from './utils/RectUtils';

export interface WindowState extends Rectangle {
    center: Point;
    halfSize: Point;

    frame: boolean;
    hidden: boolean;
    state: 'normal'|'minimized'|'maximized';

    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;

    opacity: number;
}

interface WindowIdentity extends fin.OpenFinIdentity {
    uuid: string;
    name: string;
}

/**
 * Use of this type indicates that the field is a bit mask. Variables using this type will be either a value from the
 * enum 'T', or a bitwise-or of multiple enum values. There's no way to easily enforce this in TypeScript currently, so
 * this type definition is in many ways just a convention that indicates intended usage of the variable.
 *
 * This type should only ever be used with enums, where each enum value is a power of two.
 */
export type Mask<T> = T|number;

export enum eTransformType {
    MOVE = 1 << 0,
    RESIZE = 1 << 1
}

export class SnapWindow {
    public static async getWindowState(window: fin.OpenFinWindow): Promise<WindowState> {
        return Promise
            .all([
                p<fin.WindowOptions>(window.getOptions.bind(window))(),
                p<boolean>(window.isShowing.bind(window))(),
                p<fin.WindowBounds>(window.getBounds.bind(window))()
            ])
            .then((results: [fin.WindowOptions, boolean, fin.WindowBounds]): WindowState => {
                const options: fin.WindowOptions = results[0];
                const bounds: fin.WindowBounds = results[2];
                const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
                const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

                // Apply OS-specific offsets
                if (isWin10() && options.frame) {
                    halfSize.x -= 7;
                    halfSize.y -= 3.5;
                    center.y -= 3.5;
                }

                return {
                    center,
                    halfSize,
                    frame: options.frame!,
                    hidden: !results[1],
                    state: options.state!,
                    minWidth: options.minWidth!,
                    maxWidth: options.maxWidth!,
                    minHeight: options.minHeight!,
                    maxHeight: options.maxHeight!,
                    opacity: options.opacity!
                };
            });
    }

    /**
     * A window property has been changed that may snap the window out of any group that it it's currently in.
     *
     * The service should validate the window, to ensure it's current grouping is still valid.
     *
     * Arguments: (window: SnapWindow)
     */
    public readonly onModified: Signal1<SnapWindow> = new Signal1();

    /**
     * Window is being moved/resized, need to check for any snap targets.
     *
     * Arguments: (window: SnapWindow, type: Mask<eTransformType>)
     */
    public readonly onTransform: Signal2<SnapWindow, Mask<eTransformType>> = new Signal2();

    /**
     * The move/resize operation (that was signalled through onTransform) has been completed.
     *
     * Any active snap target can now be applied.
     *
     * Arguments: (window: SnapWindow)
     */
    public readonly onCommit: Signal1<SnapWindow> = new Signal1();

    /**
     * Window was closed. Need to remove this window from any groups, and the service as a whole.
     *
     * Arguments: (window: SnapWindow)
     */
    public readonly onClose: Signal1<SnapWindow> = new Signal1();

    private window: fin.OpenFinWindow;
    private state: WindowState;

    private identity: WindowIdentity;
    private id: string;  // Created from window uuid and name
    private group: SnapGroup;
    private registered: boolean;

    // State tracking for "synth move" detection
    private boundsChangeCountSinceLastCommit: number;

    constructor(group: SnapGroup, window: fin.OpenFinWindow, initialState: WindowState) {
        this.window = window;
        this.state = initialState;

        this.identity = {uuid: window.uuid, name: window.name};
        this.id = `${window.uuid}/${window.name}`;
        this.registered = true;
        this.boundsChangeCountSinceLastCommit = 0;

        this.group = group;
        group.addWindow(this);

        // Add listeners
        window.addEventListener('bounds-changed', (event: fin.WindowBoundsEvent) => {
            this.window.updateOptions({opacity: 1.0});
            const bounds: fin.WindowBounds = this.checkBounds(event);
            const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
            const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

            this.updateState({center, halfSize});
            if (this.boundsChangeCountSinceLastCommit > 1) {
                this.onCommit.emit(this);
            } else {
                this.onModified.emit(this);
            }
            this.boundsChangeCountSinceLastCommit = 0;
        });
        window.addEventListener('frame-disabled', () => {
            this.updateState({frame: false});
            this.onModified.emit(this);
        });
        window.addEventListener('frame-enabled', () => {
            this.updateState({frame: true});
            this.onModified.emit(this);
        });
        window.addEventListener('maximized', () => {
            this.updateState({state: 'maximized'});
            this.onModified.emit(this);
        });
        window.addEventListener('minimized', () => {
            this.updateState({state: 'minimized'});
            this.onModified.emit(this);
        });
        window.addEventListener('restored', () => {
            this.updateState({state: 'normal'});
            // this.onModified.emit(this);
        });
        window.addEventListener('hidden', () => {
            this.updateState({hidden: true});
            this.onModified.emit(this);
        });
        window.addEventListener('shown', () => {
            this.updateState({hidden: false});
            // this.onModified.emit(this);
        });
        window.addEventListener('closed', () => {
            this.onClose.emit(this);
        });
        window.addEventListener('bounds-changing', async (event: fin.WindowBoundsEvent) => {
            this.window.updateOptions({opacity: 0.8});
            const bounds: fin.WindowBounds = this.checkBounds(event);
            const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
            const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

            // Convert 'changeType' into our enum type
            const type: Mask<eTransformType> = event.changeType + 1;

            this.updateState({center, halfSize});
            this.boundsChangeCountSinceLastCommit++;

            if (this.boundsChangeCountSinceLastCommit > 1) {
                this.onTransform.emit(this, type);
            }
        });
    }

    public getId(): string {
        return this.id;
    }

    public getWindow(): fin.OpenFinWindow {
        return this.window;
    }

    /**
     * Returns the group that this window currently belongs to.
     *
     * Windows and groups have a bi-directional relationship. You will also find this window within the group's list
     * of windows.
     */
    public getGroup(): SnapGroup {
        return this.group;
    }

    /**
     * Moves this window into a different group. Has no effect if function is called with the group that this window
     * currently belongs to. This also handles removing the window from it's previous group.
     *
     * Windows and groups have a bi-directional relationship. Calling this method will also add the window to the
     * group.
     *
     * NOTE: Windows must always belong to a group, so there is no corresponding 'clear'/'remove' method. To remove a
     * window from a group, you must add it to a different group.
     *
     * @param group The group that this window should be added to
     * @param offset An offset to apply to this windows position (use this to enusre window is in correct position)
     * @param newHalfSize Can also simultaneously change the size of the window
     */
    public setGroup(group: SnapGroup, offset?: Point, newHalfSize?: Point): void {
        if (group !== this.group) {
            group.addWindow(this);
            this.group = group;

            this.unsnap();
            if (offset || newHalfSize) {
                const delta: Partial<WindowState> = {};

                if (offset) {
                    delta.center = {x: this.state.center.x + offset.x, y: this.state.center.y + offset.y};
                }
                if (newHalfSize) {
                    delta.center = delta.center || {...this.state.center};
                    delta.halfSize = newHalfSize;

                    delta.center.x += newHalfSize.x - this.state.halfSize.x;
                    delta.center.y += newHalfSize.y - this.state.halfSize.y;
                }

                this.applyState(delta, () => this.snap());
            } else if (group.windows.length >= 2) {
                this.snap();
            }
        }
    }

    public getState(): WindowState {
        return this.state;
    }

    public getIdentity(): WindowIdentity {
        return this.identity;
    }

    public offsetBy(offset: Point): void {
        this.window.moveBy(offset.x, offset.y);
    }

    private snap(): void {
        const windows: SnapWindow[] = this.group.windows;
        const count = windows.length;
        const index = windows.indexOf(this);

        if (count >= 2 && index >= 0) {
            this.window.joinGroup(windows[index === 0 ? 1 : 0].window);
        } else if (index === -1) {
            console.warn('Attempting to snap, but window isn\'t in the target group');
        } else {
            console.warn('Need at least 2 windows in group to snap');
        }
    }

    private unsnap(): void {
        this.window.leaveGroup();
    }

    /**
     * Updates our state cache to reflect user changes
     */
    private updateState(delta: Partial<WindowState>): void {
        Object.assign(this.state, delta);
    }

    /**
     * Same as updateState, but also checks if 'delta' actually made any modifications
     */
    private updateStateAndCheckForChanges(delta: Partial<WindowState>): boolean {
        const state: WindowState = this.state;
        let modified = false;

        for (const key in delta) {
            if (state[key as keyof WindowState] !== delta[key as keyof WindowState]) {
                const member = key as keyof WindowState;
                const value = delta[member]!, type = typeof value;

                if (PointUtils.isPoint(value)) {
                    const oldValue = state[member] as Point;
                    if (value.x !== oldValue.x || value.y !== oldValue.y) {
                        state[member] = value;
                        modified = true;
                    }
                } else {
                    state[member] = value;
                    modified = true;
                }
            }
        }

        return modified;
    }

    /**
     * Applies changes to both our state cache, and the actual window itself.
     *
     * Can optionally specify a callback which will be triggered once any position/size changes are applied (callback
     * does not wait for non-transform related changes).
     */
    private applyState(delta: Partial<WindowState>, callback?: () => void): void {
        const state: WindowState = this.state;
        const window = this.window;

        Object.assign(state, delta);
        window.updateOptions(delta);

        if (delta.center || delta.halfSize) {
            let center = state.center, halfSize = state.halfSize;

            if (isWin10() && state.frame) {
                center = {x: center.x, y: center.y + 3.5};
                halfSize = {x: halfSize.x + 7, y: halfSize.y + 3.5};
            }

            window.setBounds(center.x - halfSize.x, center.y - halfSize.y, halfSize.x * 2, halfSize.y * 2, callback);
            // window.animate(
            //     {
            //         position: {left: center.x - halfSize.x, top: center.y - halfSize.y, duration: 100},
            //         size: {width: halfSize.x * 2, height: halfSize.y * 2, duration: 100}
            //     },
            //     {interrupt: false},
            //     callback
            // );
        } else if (callback) {
            callback();
        }
    }

    /**
     * Windows 10 has a border shadow, which needs to be accounted for in window dimensions.
     *
     * If this window has a shadow, it's bounds will be enlarged accordingly.
     *
     * @param bounds Bounds that need to be validated
     */
    private checkBounds(bounds: fin.WindowBounds): fin.WindowBounds {
        if (isWin10() && this.state.frame) {
            return {left: bounds.left + 7, top: bounds.top, width: bounds.width - 14, height: bounds.height - 7};
        } else {
            return bounds;
        }
    }
}
