import {Window} from 'hadouken-js-adapter';

import {TabServiceID} from '../../client/types';
import {apiHandler} from '../main';
import {Signal1, Signal2} from '../Signal';
import {p, promiseMap} from '../snapanddock/utils/async';
import {isWin10} from '../snapanddock/utils/platform';
import {Point} from '../snapanddock/utils/PointUtils';
import {Rectangle} from '../snapanddock/utils/RectUtils';

import {DesktopEntity} from './DesktopEntity';
import {DesktopModel} from './DesktopModel';
import {DesktopSnapGroup, Snappable} from './DesktopSnapGroup';
import {DesktopTabGroup} from './DesktopTabGroup';

export interface WindowState extends Rectangle {
    center: Point;
    halfSize: Point;

    frame: boolean;
    hidden: boolean;
    state: 'normal'|'minimized'|'maximized';

    icon: string;
    title: string;

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

/**
 * List of the messages that can be passed to the client.
 */
export const enum WindowMessages {
    // Snap & Dock
    JOIN_SNAP_GROUP = 'join-snap-group',
    LEAVE_SNAP_GROUP = 'leave-snap-group',

    // Tabbing (application messages)
    JOIN_TAB_GROUP = 'join-tab-group',
    LEAVE_TAB_GROUP = 'leave-tab-group',

    // Tabbing (tabstrip messages)
    TAB_ACTIVATED = 'tab-activated'
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

export class DesktopWindow extends DesktopEntity implements Snappable {
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
                    icon: options.icon!,
                    title: options.name!,
                    minWidth: options.minWidth!,
                    maxWidth: options.maxWidth!,
                    minHeight: options.minHeight!,
                    maxHeight: options.maxHeight!,
                    opacity: options.opacity!
                };
            });
    }

    private static isWindow(window: Window|fin.WindowOptions): window is Window {
        return window.hasOwnProperty('identity');
    }

    private static getIdentity(window: Window|fin.WindowOptions): WindowIdentity {
        if (this.isWindow(window)) {
            return window.identity as WindowIdentity;
        } else {
            return {uuid: TabServiceID.UUID, name: window.name!};
        }
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
     * Window is being removed from the service. Need to remove this window from any groups, and the service as a whole.
     *
     * This may be because the window was closed (either by user-action, or programatically), or because the window has
     * been deregistered.
     *
     * Arguments: (window: DesktopWindow)
     */
    public readonly onTeardown: Signal1<DesktopWindow> = new Signal1();

    private window?: Window;
    private windowState: WindowState;
    private applicationState: WindowState;
    // private pendingState: Partial<WindowState>;
    private modifiedState: Partial<WindowState>;

    private snapGroup: DesktopSnapGroup;
    private tabGroup: DesktopTabGroup|null;
    private prevGroup: DesktopSnapGroup|null;
    private ready: boolean;

    // State tracking for "synth move" detection
    private boundsChangeCountSinceLastCommit: number;

    constructor(model: DesktopModel, group: DesktopSnapGroup, window: fin.WindowOptions|Window, initialState?: WindowState) {
        super(model, DesktopWindow.getIdentity(window));

        this.ready = false;

        const isWindow: boolean = DesktopWindow.isWindow(window);
        if (!isWindow) {
            this.addPendingActions('Add window ' + this.id, fin.Window.create(window).then(async (window: Window) => {
                this.window = window;
                this.windowState = await DesktopWindow.getWindowState(window);
                this.applicationState = {...this.windowState};
                this.addListeners();
                this.ready = true;
            }));
        } else if (!initialState) {
            this.window = window as Window;
            this.addPendingActions('Fetch initial window state ' + this.id, DesktopWindow.getWindowState(this.window).then((state: WindowState) => {
                this.windowState = state;
                this.applicationState = {...this.windowState};
                this.addListeners();
                this.ready = true;
            }));
        } else {
            this.window = window as Window;
            this.ready = true;
        }

        if (!initialState) {
            initialState = this.createTemporaryState();
        }
        this.windowState = {...initialState};
        this.applicationState = {...initialState};
        this.modifiedState = {};
        this.boundsChangeCountSinceLastCommit = 0;

        this.snapGroup = group;
        this.tabGroup = null;
        this.prevGroup = null;
        group.addWindow(this);

        // Bind listeners
        this.handleBoundsChanged = this.handleBoundsChanged.bind(this);
        this.handleBoundsChanging = this.handleBoundsChanging.bind(this);
        this.handleClosed = this.handleClosed.bind(this);
        this.handleFocused = this.handleFocused.bind(this);
        this.handleFrameDisabled = this.handleFrameDisabled.bind(this);
        this.handleFrameEnabled = this.handleFrameEnabled.bind(this);
        this.handleGroupChanged = this.handleGroupChanged.bind(this);
        this.handleHidden = this.handleHidden.bind(this);
        this.handleMaximized = this.handleMaximized.bind(this);
        this.handleMinimized = this.handleMinimized.bind(this);
        this.handleRestored = this.handleRestored.bind(this);
        this.handleShown = this.handleShown.bind(this);

        if (this.ready) {
            this.addListeners();
        }

        DesktopWindow.onCreated.emit(this);
    }

    /**
     * Removes this window from the model. This may happen because the window that this object wraps has been closed, or because an application is
     * de-registering this window from the service.
     *
     * That means that the window wrapped by this object may or may not exist at the point this is called. We attempt to capture this by having DesktopWindow
     * manage it's own destruction in the former case, so that it can mark itself as not-ready before starting the clean-up of the model.
     */
    public teardown(): void {
        if (this.ready) {
            this.cleanupListeners();
        }

        this.onTeardown.emit(this);
        DesktopWindow.onDestroyed.emit(this);
        this.ready = false;
    }

    private createTemporaryState(): WindowState {
        return {
            center: {x: 500, y: 300},
            halfSize: {x: 200, y: 100},
            frame: false,
            hidden: false,
            state: 'normal',
            icon: '',
            title: '',
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

    public isReady(): boolean {
        return this.ready;
    }

    /**
     * Returns the group that this window currently belongs to.
     *
     * Windows and groups have a bi-directional relationship. You will also find this window within the group's list
     * of windows.
     */
    public getSnapGroup(): DesktopSnapGroup {
        return this.snapGroup;
    }

    public getTabGroup(): DesktopTabGroup|null {
        return this.tabGroup;
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
     */
    public setSnapGroup(group: DesktopSnapGroup, offset?: Point, newHalfSize?: Point): Promise<void> {
        if (group !== this.snapGroup) {
            this.addToSnapGroup(group);

            // Leave previous snap group
            if (this.snapGroup === group && this.ready) {
                // TODO: Ensure returned promise includes this change. Need to await this?..
                this.addPendingActions('setSnapGroup - leave existing group', this.window!.leaveGroup());
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

                return this.updateState(delta, ActionOrigin.SERVICE).then(async () => {
                    if (group.windows.length >= 2) {
                        await this.snap();
                    }
                });
            } else if (group.windows.length >= 2) {
                return this.snap();
            }
        }

        return Promise.resolve();
    }

    public setTabGroup(group: DesktopTabGroup|null): void {
        // TODO: Remove from existing tab group, apply window group, etc (TBD: here, in DesktopTabGroup, or in TabService?)
        this.tabGroup = group;

        if (group) {
            console.log('Added ' + this.id + ' to ' + group.ID);
        } else {
            console.log('Restoring tab state');
            // this.updateState(
            //     {
            //         center: this.applicationState.center,
            //         halfSize: this.applicationState.halfSize,
            //         frame: this.applicationState.frame,
            //         // hidden: this.applicationState.hidden
            //     },
            //     ActionOrigin.SERVICE);
        }
    }

    public getState(): WindowState {
        return this.windowState;
    }

    public getIdentity(): WindowIdentity {
        return this.identity;
    }

    public getIsActive(): boolean {
        const state: WindowState = this.windowState;
        return !state.hidden && state.opacity > 0 && state.state !== 'minimized';
    }

    public refresh(): Promise<void> {
        const window: Window = this.window!;

        if (this.ready) {
            return DesktopWindow.getWindowState(window).then((state: WindowState) => {
                return this.updateState(state, ActionOrigin.APPLICATION);
            });
        } else {
            return Promise.resolve();
        }
    }

    private snap(): Promise<void> {
        const group: DesktopSnapGroup = this.snapGroup;
        const windows: DesktopWindow[] = this.snapGroup.windows as DesktopWindow[];
        const count = windows.length;
        const index = windows.indexOf(this);

        if (count >= 2 && index >= 0) {
            const other: DesktopWindow = windows[index === 0 ? 1 : 0];

            // Merge window groups
            return Promise.all([this.sync(), other.sync()]).then(() => {
                const joinGroupPromise: Promise<void> = (async () => {
                    if (this.ready && group === this.snapGroup) {
                        await this.window!.joinGroup(other.window!);

                        // Re-fetch window list in case it has changed during sync
                        const windows: DesktopWindow[] = this.snapGroup.windows as DesktopWindow[];

                        // Bring other windows in group to front
                        await windows.map(groupWindow => groupWindow.window!.bringToFront());
                    }
                })();

                return this.addPendingActions('snap - joinGroup', joinGroupPromise);
            });
        } else if (index === -1) {
            return Promise.reject('Attempting to snap, but window isn\'t in the target group');
        } else {
            return Promise.reject('Need at least 2 windows in group to snap');
        }
    }

    private addToSnapGroup(group: DesktopSnapGroup): void {
        this.prevGroup = this.snapGroup;
        this.snapGroup = group;
        group.addWindow(this);
    }

    private async updateState(delta: Partial<WindowState>, origin: ActionOrigin): Promise<void> {
        const actions: Promise<void>[] = [];

        if (origin !== ActionOrigin.APPLICATION) {
            // Ensure we can modify window before we update our cache
            if (!this.ready) {
                throw new Error('Cannot modify window, window not in ready state ' + this.id);
            }
        }

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
            const {center, halfSize, state, hidden, ...options} = delta;
            const optionsToChange: (keyof WindowState)[] = Object.keys(options) as (keyof WindowState)[];

            // Apply visibility
            if (hidden !== undefined) {  // && hidden !== this.windowState.hidden) {
                actions.push(hidden ? window.hide() : window.show());
            }

            // Apply window state
            if (state !== undefined) {  // && state !== this.windowState.state) {
                switch (state) {
                    case 'normal':
                        actions.push(window.restore());
                        break;
                    case 'minimized':
                        actions.push(window.minimize());
                        break;
                    case 'maximized':
                        actions.push(window.maximize());
                        break;
                    default:
                        console.warn('Invalid window state: ' + state);
                        break;
                }
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

            // Apply options
            if (optionsToChange.length > 0) {
                if (window && window.updateOptions) {
                    actions.push(window.updateOptions(options));
                } else {
                    console.error('No window', window);
                }
            }

            // Track these changes
            return this.addPendingActions('updateState ' + this.id + ' ' + JSON.stringify(delta), actions);
        }
    }

    public async bringToFront(): Promise<void> {
        return this.addPendingActions('bringToFront ' + this.id, this.window!.bringToFront());
    }

    public async close(): Promise<void> {
        this.ready = false;
        return this.addPendingActions('close ' + this.id, this.window!.close(true));
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

    // tslint:disable-next-line:no-any
    public async sendMessage(action: WindowMessages, payload: any): Promise<void> {
        if (this.ready) {
            await apiHandler.sendToClient(this.identity, action, payload);
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
        window.addListener('bounds-changing', this.handleBoundsChanging);
        window.addListener('closed', this.handleClosed);
        window.addListener('focused', this.handleFocused);
        window.addListener('frame-disabled', this.handleFrameDisabled);
        window.addListener('frame-enabled', this.handleFrameEnabled);
        window.addListener('group-changed', this.handleGroupChanged);
        window.addListener('hidden', this.handleHidden);
        window.addListener('maximized', this.handleMaximized);
        window.addListener('minimized', this.handleMinimized);
        window.addListener('restored', this.handleRestored);
        window.addListener('shown', this.handleShown);
    }

    private cleanupListeners(): void {
        const window: Window = this.window!;

        window.removeListener('bounds-changed', this.handleBoundsChanged);
        window.removeListener('bounds-changing', this.handleBoundsChanging);
        window.removeListener('closed', this.handleClosed);
        window.removeListener('focused', this.handleFocused);
        window.removeListener('frame-disabled', this.handleFrameDisabled);
        window.removeListener('frame-enabled', this.handleFrameEnabled);
        window.removeListener('group-changed', this.handleGroupChanged);
        window.removeListener('hidden', this.handleHidden);
        window.removeListener('maximized', this.handleMaximized);
        window.removeListener('minimized', this.handleMinimized);
        window.removeListener('restored', this.handleRestored);
        window.removeListener('shown', this.handleShown);
        window.leaveGroup();
    }

    private handleBoundsChanged(event: fin.WindowBoundsEvent): void {
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
    }

    private handleBoundsChanging(event: fin.WindowBoundsEvent): void {
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
    }

    private handleClosed(): void {
        // If 'onclose' event has fired, we shouldn't attempt to call any OpenFin API on the window.
        // Will immediately reset ready flag, to prevent any API calls as part of clean-up/destroy process.
        this.ready = false;

        // Clean-up model state
        this.teardown();
    }

    private async handleFocused(): Promise<void> {
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

    private handleFrameDisabled(): void {
        this.updateState({frame: false}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    }

    private handleFrameEnabled(): void {
        this.updateState({frame: true}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    }

    private handleGroupChanged(event: fin.WindowGroupChangedEvent): void {
        // Each group operation will raise an event from every window involved. We should filter out to
        // only receive the one from the window being moved.
        if (event.name !== event.sourceWindowName || event.uuid !== event.sourceWindowAppUuid) {
            return;
        }

        console.log('Received window group changed event: ', event);

        if (event.reason === 'leave') {
            this.addToSnapGroup(new DesktopSnapGroup());
        } else {
            const targetWindow: DesktopWindow|null = this.model.getWindow({uuid: event.targetWindowAppUuid, name: event.targetWindowName});

            // Merge the groups
            if (targetWindow) {
                if (event.reason === 'merge') {
                    this.addToSnapGroup(targetWindow.getSnapGroup());

                    // When merging groups, only the window that triggered the merge will recieve the event, but we need to update all windows in that window's
                    // group
                    // Get array of SnapWindows from the native group window array
                    event.sourceGroup
                        .map(win => {
                            return this.model.getWindow({uuid: win.appUuid, name: win.windowName});
                        })
                        // Add all windows from source group to the target group.
                        // Windows are synthetic snapped since they are
                        // already native grouped.
                        .forEach((snapWin) => {
                            // Ignore any undefined results (i.e. windows unknown to the service)
                            if (snapWin !== null) {
                                snapWin.addToSnapGroup(targetWindow.getSnapGroup());
                            }
                        });

                    const windowsInGroup: DesktopWindow[] = this.snapGroup.windows as DesktopWindow[];  // TODO: Test snap groups that contain tabs
                    windowsInGroup.forEach((window: DesktopWindow) => {
                        window.addToSnapGroup(targetWindow.getSnapGroup());
                    });
                } else {
                    this.addToSnapGroup(targetWindow.getSnapGroup());
                }
            }
        }
    }

    private handleHidden(): void {
        this.updateState({hidden: true}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    }

    private handleMaximized(): void {
        this.updateState({state: 'maximized'}, ActionOrigin.APPLICATION);
        this.onModified.emit(this);
    }

    private handleMinimized(): void {
        this.updateState({state: 'minimized'}, ActionOrigin.APPLICATION);
        this.snapGroup.windows.forEach((window: Snappable) => {
            (window as DesktopWindow).updateState({state: 'minimized'}, ActionOrigin.SERVICE);
        });
        this.onModified.emit(this);
    }

    private handleRestored(): void {
        this.updateState({state: 'normal'}, ActionOrigin.APPLICATION);
        this.snapGroup.windows.forEach((window: Snappable) => {
            (window as DesktopWindow).updateState({state: 'normal'}, ActionOrigin.SERVICE);
        });
        // this.onModified.emit(this);
    }

    private handleShown(): void {
        this.updateState({hidden: false}, ActionOrigin.APPLICATION);
        // this.onModified.emit(this);
    }
}
