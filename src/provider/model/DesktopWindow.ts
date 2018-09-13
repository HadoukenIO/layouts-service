import {Identity, Window} from 'hadouken-js-adapter';

import {TabServiceID} from '../../client/types';
import {Signal1, Signal2} from '../Signal';
import {p, promiseMap} from '../snapanddock/utils/async';
import {isWin10} from '../snapanddock/utils/platform';
import {Point} from '../snapanddock/utils/PointUtils';
import {Rectangle} from '../snapanddock/utils/RectUtils';

import {DesktopEntity} from './DesktopEntity';
import {DesktopSnapGroup, Snappable} from './DesktopSnapGroup';

// tslint:disable-next-line:no-any
declare var fin: any;

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

export interface WindowIdentity extends fin.OpenFinIdentity {
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

enum ActionOrigin {
    /**
     * A change made by the application itself.
     *
     * Service should still allow applications to use the OpenFin API's directly. In cases where the service needs to
     * override the application's behaviour, it should always make an effort to restore the application's state
     * afterward.
     */
    APPLICATION,

    /**
     * A change made by the service that is intended to be permenant or long-lived. These are changes that will either
     * never be reverted, or only reverted once the service is done with the window.
     *
     * e.g: Resizing a window when it is dropped into a tab set.
     */
    SERVICE,

    /**
     * A change made by the service that is intended to be very short-lived, and will soon be reverted.
     *
     * These changes can be reverted using 'SnapWindow.revertProperty'
     *
     * e.g: Applying opacity effects when dragging windows and snap/tab previews.
     */
    SERVICE_TEMPORARY
}

export class DesktopWindow extends DesktopEntity {
    public static readonly onCreated: Signal1<DesktopWindow> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopWindow> = new Signal1();

    public static async getWindowState(window: Window): Promise<WindowState> {
        return Promise.all([window.getOptions(), window.isShowing(), window.getBounds()])
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
     * Arguments: (window: DesktopWindow)
     */
    public readonly onModified: Signal1<DesktopWindow> = new Signal1();

    /**
     * Window is being moved/resized, need to check for any snap targets.
     *
     * Arguments: (window: DesktopWindow, type: Mask<eTransformType>)
     */
    public readonly onTransform: Signal2<DesktopWindow, Mask<eTransformType>> = new Signal2();

    /**
     * The move/resize operation (that was signalled through onTransform) has been completed.
     *
     * Any active snap target can now be applied.
     *
     * Arguments: (window: DesktopWindow)
     */
    public readonly onCommit: Signal1<DesktopWindow> = new Signal1();

    /**
     * Window was closed. Need to remove this window from any groups, and the service as a whole.
     *
     * Arguments: (window: DesktopWindow)
     */
    public readonly onClose: Signal1<DesktopWindow> = new Signal1();

    private window?: Window;
    private windowState: WindowState;
    private applicationState: WindowState;
    // private pendingState: Partial<WindowState>;
    private modifiedState: Partial<WindowState>;

    private prevGroup: DesktopSnapGroup|null;
    private initialised: boolean;

    // State tracking for "synth move" detection
    private boundsChangeCountSinceLastCommit: number;

    constructor(group: DesktopSnapGroup, window: WindowIdentity|Window, initialState?: WindowState) {
        super(group, (window.hasOwnProperty('uuid') ? window : (window as Window).identity) as WindowIdentity);

        const isWindow: boolean = window !== this.identity;
        const identity: WindowIdentity = (isWindow ? (window as Window).identity : window) as WindowIdentity;
        this.initialised = false;

        if (!isWindow) {
            fin.Window.wrap(identity).then(async (window: Window) => {
                this.window = window;
                this.windowState = await DesktopWindow.getWindowState(window);
                this.applicationState = {...this.windowState};
                this.initialised = true;
            });
        } else if (!initialState) {
            this.window = window as Window;
            DesktopWindow.getWindowState(this.window).then((state: WindowState) => {
                this.windowState = state;
                this.applicationState = {...this.windowState};
                this.initialised = true;
            });
        } else {
            this.window = window as Window;
            this.initialised = true;
        }

        if (!initialState) {
            initialState = this.createTemporaryState();
        }
        this.windowState = {...initialState};
        this.applicationState = {...initialState};
        this.modifiedState = {};
        this.boundsChangeCountSinceLastCommit = 0;

        this.group = group;
        this.prevGroup = null;
        group.addWindow(this);

        if (this.initialised) {
            this.addListeners();
        }

        // When the window's onClose signal is emitted, we cleanup all of the listeners
        this.onClose.add(this.cleanupListeners, this);

        DesktopWindow.onCreated.emit(this);
    }

    private createTemporaryState(): WindowState {
        return {
            center: {x: 500, y: 300},
            halfSize: {x: 200, y: 100},
            frame: false,
            hidden: false,
            state: 'normal',
            minWidth: -1,
            maxWidth: -1,
            minHeight: 0,
            maxHeight: 0,
            opacity: 1
        };
    }

    public get[Symbol.toStringTag]() {
        return this.id;
    }

    public getId(): string {
        return this.id;
    }

    public getWindow(): Window {
        return this.window!;
    }

    /**
     * Returns the group that this window currently belongs to.
     *
     * Windows and groups have a bi-directional relationship. You will also find this window within the group's list
     * of windows.
     */
    public getGroup(): DesktopSnapGroup {
        return this.group;
    }

    public getPrevGroup(): DesktopSnapGroup|null {
        return this.prevGroup;
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
     * @param synthetic Signifies that the setGroup has been triggered by a native group event. Will disable native group changes that would normally occur
     */
    public setGroup(group: DesktopSnapGroup, offset?: Point, newHalfSize?: Point, synthetic?: boolean): void {
        if (group !== this.group) {
            this.prevGroup = this.group;
            this.group = group;
            group.addWindow(this);

            if (!synthetic) {
                this.unsnap();
            }

            if (offset || newHalfSize) {
                const delta: Partial<WindowState> = {};

                if (offset) {
                    delta.center = {x: this.windowState.center.x + offset.x, y: this.windowState.center.y + offset.y};
                }
                if (newHalfSize) {
                    delta.center = delta.center || {...this.windowState.center};
                    delta.halfSize = newHalfSize;

                    delta.center.x += newHalfSize.x - this.windowState.halfSize.x;
                    delta.center.y += newHalfSize.y - this.windowState.halfSize.y;
                }

                // TODO: Make async
                this.updateState(delta, ActionOrigin.SERVICE).then(() => {
                    if (!synthetic) {
                        this.snap();
                    }
                });
            } else if (group.windows.length >= 2 && !synthetic) {
                this.snap();
            }
        }
    }

    public getState(): WindowState {
        return this.windowState;
    }

    public getIdentity(): WindowIdentity {
        return this.identity;
    }

    private snap(): void {
        const windows: DesktopWindow[] = this.group.windows as DesktopWindow[];
        const count = windows.length;
        const index = windows.indexOf(this);

        if (count >= 2 && index >= 0) {
            this.window!.joinGroup(windows[index === 0 ? 1 : 0].window!);

            // Bring other windows in group to front
            windows.forEach((groupWindow: DesktopWindow) => {
                if (groupWindow !== this) {
                    groupWindow.window!.bringToFront();
                }
            });
        } else if (index === -1) {
            console.warn('Attempting to snap, but window isn\'t in the target group');
        } else {
            console.warn('Need at least 2 windows in group to snap');
        }
    }

    private unsnap(): void {
        this.window!.leaveGroup();
    }

    private refreshOptions(): void {
        DesktopWindow.getWindowState(this.window!).then((state: WindowState) => {
            // TODO: Filter to only properties that have changed?
            this.updateState(state, ActionOrigin.APPLICATION);
        });
    }

    private async updateState(delta: Partial<WindowState>, origin: ActionOrigin): Promise<void> {
        const actions: Promise<void>[] = [];

        // Update state caches
        if (origin === ActionOrigin.SERVICE_TEMPORARY) {
            // Back-up existing values, so they can be restored later
            Object.keys(delta).forEach((key: string) => {
                const property: keyof WindowState = key as keyof WindowState;
                if (!this.modifiedState.hasOwnProperty(property)) {
                    this.modifiedState[property] = this.windowState[property];
                }
            });
        } else {
            // These changes will undo any temporary changes that have been applied
            Object.keys(delta).forEach((property) => {
                if (this.modifiedState.hasOwnProperty(property)) {
                    delete this.modifiedState[property as keyof WindowState];
                }
            });
        }
        Object.assign(this.windowState, delta);

        // Apply changes to the window (unless we're reacting to an external change that has already happened)
        if (origin !== ActionOrigin.APPLICATION) {
            const window = this.window!;
            const {center, halfSize, hidden, ...options} = delta;
            const optionsToChange: (keyof WindowState)[] = Object.keys(options) as (keyof WindowState)[];

            // Apply visibility
            if (hidden !== undefined && hidden !== this.windowState.hidden) {
                actions.push(hidden ? window.hide() : window.show());
            }

            // Apply options
            if (optionsToChange.length > 0) {
                actions.push(window.updateOptions(options));
            }

            // Apply bounds
            if (center || halfSize) {
                const state: WindowState = this.windowState;
                let newCenter = center || state.center, newHalfSize = halfSize || state.halfSize;

                if (isWin10() && state.frame) {
                    newCenter = {x: newCenter.x, y: newCenter.y + 3.5};
                    newHalfSize = {x: newHalfSize.x + 7, y: newHalfSize.y + 3.5};
                }

                actions.push(window.setBounds(
                    {left: newCenter.x - newHalfSize.x, top: newCenter.y - newHalfSize.y, width: newHalfSize.x * 2, height: newHalfSize.y * 2}));
            }

            // Track these changes
            return this.addPendingActions(actions);
        }
    }

    public async applyProperties(properties: Partial<WindowState>): Promise<void> {
        this.updateState(properties, ActionOrigin.SERVICE);
    }

    public async applyProperty(property: keyof WindowState, value: any): Promise<void> {  // tslint:disable-line:no-any
        if (value !== this.windowState[property]) {
            this.modifiedState[property] = this.modifiedState[property] || this.windowState[property];
            this.windowState[property] = value;

            return this.updateState({[property]: value}, ActionOrigin.SERVICE_TEMPORARY);
        }
    }

    public async applyOverride(property: keyof WindowState, value: any): Promise<void> {  // tslint:disable-line:no-any
        if (value !== this.windowState[property]) {
            this.modifiedState[property] = this.modifiedState[property] || this.windowState[property];
            this.windowState[property] = value;

            return this.updateState({[property]: value}, ActionOrigin.SERVICE_TEMPORARY);
        }
    }

    public async resetOverride(property: keyof WindowState): Promise<void> {
        if (this.modifiedState.hasOwnProperty(property)) {
            const value = this.modifiedState[property]!;
            this.windowState[property] = value;
            return this.updateState({[property]: value}, ActionOrigin.SERVICE);  // TODO: Is this the right origin type?
        }
    }

    private async applyOffset(offset?: Point, newHalfSize?: Point, synthetic?: boolean): Promise<void> {
        if (offset || newHalfSize) {
            const state: WindowState = this.windowState;
            const delta: Partial<WindowState> = {};

            if (offset) {
                delta.center = {x: state.center.x + offset.x, y: state.center.y + offset.y};
            }
            if (newHalfSize) {  //} && !(this.isTabStrip() || this.tabSet)) {
                delta.center = delta.center || {...state.center};
                delta.halfSize = newHalfSize;

                delta.center.x += newHalfSize.x - state.halfSize.x;
                delta.center.y += newHalfSize.y - state.halfSize.y;
            }

            await this.updateState(delta, ActionOrigin.SERVICE);
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
        if (isWin10() && this.windowState.frame) {
            return {left: bounds.left + 7, top: bounds.top, width: bounds.width - 14, height: bounds.height - 7};
        } else {
            return bounds;
        }
    }

    private addListeners(): void {
        const window: Window = this.window!;

        window.addListener('bounds-changed', this.handleBoundsChanged);
        window.addListener('frame-disabled', this.handleFrameDisabled);
        window.addListener('frame-enabled', this.handleFrameEnabled);
        window.addListener('maximized', this.handleMaximized);
        window.addListener('minimized', this.handleMinimized);
        window.addListener('restored', this.handleRestored);
        window.addListener('hidden', this.handleHidden);
        window.addListener('shown', this.handleShown);
        window.addListener('closed', this.handleClosed);
        window.addListener('bounds-changing', this.handleBoundsChanging);
        window.addListener('focused', this.handleFocused);
    }

    private cleanupListeners(unused?: DesktopWindow): void {
        console.log('OnClose recieved for window ', this.getId());

        DesktopWindow.onDestroyed.emit(this);

        const window: Window = this.window!;
        window.removeListener('bounds-changed', this.handleBoundsChanged);
        window.removeListener('frame-disabled', this.handleFrameDisabled);
        window.removeListener('frame-enabled', this.handleFrameEnabled);
        window.removeListener('maximized', this.handleMaximized);
        window.removeListener('minimized', this.handleMinimized);
        window.removeListener('restored', this.handleRestored);
        window.removeListener('hidden', this.handleHidden);
        window.removeListener('shown', this.handleShown);
        window.removeListener('closed', this.handleClosed);
        window.removeListener('bounds-changing', this.handleBoundsChanging);
        window.removeListener('focused', this.handleFocused);

        this.onClose.remove(this.cleanupListeners);
    }

    /* ===== Event Handlers ===== */
    private handleBoundsChanged = (event: fin.WindowBoundsEvent) => {
        const bounds: fin.WindowBounds = this.checkBounds(event);
        const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
        const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

        this.updateState({center, halfSize}, ActionOrigin.APPLICATION);
        if (this.boundsChangeCountSinceLastCommit > 1) {
            this.onCommit.emit(this);
        } else {
            this.onModified.emit(this);
        }
        this.boundsChangeCountSinceLastCommit = 0;
    };
    private handleFrameDisabled = () => {
        this.updateState({frame: false}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    };
    private handleFrameEnabled = () => {
        this.updateState({frame: true}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    };
    private handleMaximized = () => {
        this.updateState({state: 'maximized'}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    };
    private handleMinimized = () => {
        this.updateState({state: 'minimized'}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    };
    private handleRestored = () => {
        this.updateState({state: 'normal'}, ActionOrigin.APPLICATION);
        // this.onModified.emit(this);
    };
    private handleHidden = () => {
        this.updateState({hidden: true}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    };
    private handleShown = () => {
        this.updateState({hidden: false}, ActionOrigin.APPLICATION);
        // this.onModified.emit(this);
    };
    private handleClosed = () => {
        this.onClose.emit(this);
    };
    private handleBoundsChanging = async (event: fin.WindowBoundsEvent) => {
        const bounds: fin.WindowBounds = this.checkBounds(event);
        const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
        const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

        // Convert 'changeType' into our enum type
        const type: Mask<eTransformType> = event.changeType + 1;

        this.updateState({center, halfSize}, ActionOrigin.APPLICATION);
        this.boundsChangeCountSinceLastCommit++;

        if (this.boundsChangeCountSinceLastCommit > 1) {
            this.onTransform.emit(this, type);
        }
    };
    private handleFocused = async () => {
        // Loop through all windows in the same group as the focused window and bring them
        // all to front
        const window: fin.OpenFinWindow = fin.desktop.Window.wrap(this.identity.uuid, this.identity.name);
        const group: fin.OpenFinWindow[] = await p<fin.OpenFinWindow[]>(window.getGroup.bind(window))();
        await promiseMap(group, async (window: fin.OpenFinWindow) => {
            await p<never>(window.bringToFront.bind(window))();
        });

        // V2 'getGroup' API has bug: https://appoji.jira.com/browse/RUN-4535
        // await this.window.getGroup().then((group: Window[]) => {
        //     return Promise.all(group.map((window: Window) => window.bringToFront()));
        // });
    }
}
