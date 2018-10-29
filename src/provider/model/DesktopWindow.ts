import {Identity, Window} from 'hadouken-js-adapter';

import {TabServiceID} from '../../client/types';
import {apiHandler} from '../main';
import {Signal1, Signal2} from '../Signal';
import {promiseMap} from '../snapanddock/utils/async';
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
    showTaskbarIcon: boolean;

    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;

    opacity: number;
    frameEnabled: boolean;  // If window will respond to move/resize events. Corresponds to enable/disableFrame, not WindowOptions.frame.
}

export interface WindowIdentity extends Identity {
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
     * These changes can be reverted using 'DesktopWindow.resetOverride'
     *
     * e.g: Applying opacity effects when dragging windows and snap/tab previews.
     */
    SERVICE_TEMPORARY
}

type OpenFinWindowEventHandler = <K extends keyof fin.OpenFinWindowEventMap>(event: fin.OpenFinWindowEventMap[K]) => void;

export class DesktopWindow extends DesktopEntity implements Snappable {
    public static readonly onCreated: Signal1<DesktopWindow> = new Signal1();
    public static readonly onDestroyed: Signal1<DesktopWindow> = new Signal1();
    public static emulateDragEvents: boolean;

    /**
     * When in 'emulateDragEvents' mode, the service needs to call disableFrame on every window that is registered 
     * with the service. However, this may cause issues with applications that are already using 'disableFrame'.
     * 
     * Service assumes that any window that uses disableFrame will call it immediately after creating the window. If
     * disableFrame() has not been called after waiting this many milliseconds, the service assumes it can take control
     * of disabling the frame and moving/resizing the window.
     */
    private static readonly DISABLE_BOUNDS_DELAY = 1000;

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
                    icon: options.icon || `https://www.google.com/s2/favicons?domain=${options.url}`,
                    title: options.name!,
                    showTaskbarIcon: options.showTaskbarIcon!,
                    minWidth: options.minWidth!,
                    maxWidth: options.maxWidth!,
                    minHeight: options.minHeight!,
                    maxHeight: options.maxHeight!,
                    opacity: options.opacity!,
                    frameEnabled: true  // No way to query frame enabled/disabled state from API. Assume frame is enabled
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
     * Arguments: (window: DesktopWindow, type: Mask<eTransformType>)
     */
    public readonly onCommit: Signal2<DesktopWindow, Mask<eTransformType>> = new Signal2();

    /**
     * Window is being removed from the service. Need to remove this window from any groups, and the service as a whole.
     *
     * This may be because the window was closed (either by user-action, or programatically), or because the window has
     * been deregistered.
     *
     * Arguments: (window: DesktopWindow)
     */
    public readonly onTeardown: Signal1<DesktopWindow> = new Signal1();

    private window: Window;

    /**
     * Cached state. Reflects the current state of the *actual* window object - basically, what you would get if you called any of the OpenFin API functions on
     * the window object.
     */
    private windowState: WindowState;

    /**
     * What the application "thinks" the state of this window is. This is the state of the window, excluding any changes made to the window by the service.
     */
    private applicationState: WindowState;

    /**
     * Lists all the modifications made to the window by the service. This is effectively a 'diff' between windowState and applicationState.
     */
    private modifiedState: Partial<WindowState>;

    /**
     * A subset of modifiedState - changes made to the window on a very short-term basis, which will soon be reverted.
     *
     * When reverting, the property may go back to a value set by the application, or an earlier value set by the service.
     *
     * NOTE: The values within this object are the *previous* values of each property - what the property should be set to when reverting the temporary change.
     * The temporary value can be found by looking up the keys of this object within 'windowState'.
     */
    private temporaryState: Partial<WindowState>;

    private snapGroup: DesktopSnapGroup;
    private tabGroup: DesktopTabGroup|null;
    private prevGroup: DesktopSnapGroup|null;
    private ready: boolean;

    // Tracks event listeners registered on the fin window for easier cleanup.
    private registeredListeners: Map<keyof fin.OpenFinWindowEventMap, OpenFinWindowEventHandler> = new Map();

    private userInitiatedBoundsChange = false;

    constructor(model: DesktopModel, group: DesktopSnapGroup, window: fin.WindowOptions|Window, initialState?: WindowState) {
        super(model, DesktopWindow.getIdentity(window));

        this.ready = false;

        if (!DesktopWindow.isWindow(window)) {
            this.window = fin.Window.wrapSync({uuid: fin.Application.me.uuid, name: window.name});
            this.addPendingActions('Add window ' + this.id, fin.Window.create(window).then(async (window: Window) => {
                this.window = window;
                this.windowState = await DesktopWindow.getWindowState(window);
                this.applicationState = {...this.windowState};

                this.ready = true;
                this.addListeners();
            }));
        } else if (!initialState) {
            this.window = window as Window;
            this.addPendingActions('Fetch initial window state ' + this.id, DesktopWindow.getWindowState(this.window).then((state: WindowState) => {
                this.windowState = state;
                this.applicationState = {...this.windowState};

                this.ready = true;
                this.addListeners();
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
        this.temporaryState = {};
        this.snapGroup = group;
        this.tabGroup = null;
        this.prevGroup = null;
        group.addWindow(this);

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
            this.window.leaveGroup();
        }
        this.cleanupListeners();
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
            showTaskbarIcon: true,
            minWidth: -1,
            maxWidth: -1,
            minHeight: 0,
            maxHeight: 0,
            opacity: 1,
            frameEnabled: true
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
    public dockToGroup(group: DesktopSnapGroup, offset?: Point, newHalfSize?: Point): Promise<void> {
        if (group !== this.snapGroup) {
            this.addToSnapGroup(group);

            // Leave previous snap group
            if (this.snapGroup === group && this.ready) {
                // TODO: Ensure returned promise includes this change. Need to await this?..
                this.addPendingActions('setSnapGroup - leave existing group', this.window.leaveGroup());
            }

            if (offset || newHalfSize) {
                return this.snapToGroup(group, offset, newHalfSize).then(async () => {
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

    public snapToGroup(group: DesktopSnapGroup, offset?: Point, newHalfSize?: Point): Promise<void> {
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

        return this.updateState(delta, ActionOrigin.SERVICE);
    }

    public setTabGroup(group: DesktopTabGroup|null): Promise<void> {
        if (group) {
            console.log('Added ' + this.id + ' to ' + group.ID);
        } else if (this.tabGroup) {
            console.log('Removed ' + this.id + ' from ' + this.tabGroup.ID);
        }

        this.tabGroup = group;

        // Hide tabbed windows in the task bar (except for tabstrip windows)
        if (this.identity.uuid !== TabServiceID.UUID) {
            if (group) {
                // Hide tabbed windows in taskbar
                return this.ready ? this.updateState({showTaskbarIcon: false}, ActionOrigin.SERVICE) : Promise.resolve();
            } else if (this.windowState.showTaskbarIcon !== this.applicationState.showTaskbarIcon) {
                // Revert taskbar icon to application-specified state
                return this.ready ? this.updateState({showTaskbarIcon: this.applicationState.showTaskbarIcon}, ActionOrigin.SERVICE) : Promise.resolve();
            }
        }

        // Nothing to do
        return Promise.resolve();
    }

    public getState(): WindowState {
        return this.windowState;
    }

    public getApplicationState(): WindowState {
        return this.applicationState;
    }

    public getIdentity(): WindowIdentity {
        return this.identity;
    }

    public getIsActive(): boolean {
        const state: WindowState = this.windowState;
        return !state.hidden && state.opacity > 0 && state.state !== 'minimized';
    }

    public refresh(): Promise<void> {
        const window: Window = this.window;

        if (this.ready) {
            return DesktopWindow.getWindowState(window).then((state: WindowState) => {
                const appState: WindowState = this.applicationState;
                const modifications: Partial<WindowState> = {};
                let hasChanges = false;

                for (const iter in state) {
                    if (state.hasOwnProperty(iter)) {
                        const key = iter as keyof WindowState;

                        if (this.isModified(key, appState, state) &&
                            (!this.modifiedState.hasOwnProperty(key) || this.isModified(key, this.modifiedState, state))) {
                            modifications[key] = state[key];
                            hasChanges = true;
                        }
                    }
                }

                if (hasChanges) {
                    console.log('Window refresh found changes: ', this.id, modifications);
                    return this.updateState(modifications, ActionOrigin.APPLICATION);
                } else {
                    console.log('Refreshed window, no changes were found', this.id);
                    return Promise.resolve();
                }
            });
        } else {
            return Promise.resolve();
        }
    }

    private isModified(key: keyof WindowState, prevState: Partial<WindowState>, newState: WindowState): boolean {
        if (prevState[key] === undefined) {
            return true;
        } else if (key === 'center' || key === 'halfSize') {
            const prevPoint: Point = prevState[key] as Point, newPoint: Point = newState[key] as Point;
            return prevPoint.x !== newPoint.x || prevPoint.y !== newPoint.y;
        } else {
            return prevState[key] !== newState[key];
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
                        await this.window.joinGroup(other.window);

                        // Re-fetch window list in case it has changed during sync
                        const windows: DesktopWindow[] = this.snapGroup.windows as DesktopWindow[];

                        // Bring other windows in group to front
                        await windows.map(groupWindow => groupWindow.window.bringToFront());
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
        } else {
            // Find changes from the application that weren't already known to the service
            Object.keys(delta).forEach((key: string) => {
                const property: keyof WindowState = key as keyof WindowState;
                if (this.isModified(property, delta, this.windowState)) {
                    this.applicationState[property] = delta[property]!;
                }
            });
        }

        // Update state caches
        if (origin === ActionOrigin.SERVICE_TEMPORARY) {
            // Back-up existing values, so they can be restored later
            Object.keys(delta).forEach((key: string) => {
                const property: keyof WindowState = key as keyof WindowState;
                if (!this.temporaryState.hasOwnProperty(property)) {
                    this.temporaryState[property] = this.windowState[property];
                }
            });
        } else {
            Object.keys(delta).forEach((key: string) => {
                const property: keyof WindowState = key as keyof WindowState;

                // These changes will undo any temporary changes that have been applied
                if (this.temporaryState.hasOwnProperty(property)) {
                    delete this.temporaryState[property];
                }

                // Track which properties have been modified by the service
                if (this.isModified(property, delta, this.applicationState)) {
                    this.modifiedState[property] = delta[property];
                } else {
                    delete this.modifiedState[property];
                }
            });
        }
        Object.assign(this.windowState, delta);

        // Apply changes to the window (unless we're reacting to an external change that has already happened)
        if (origin !== ActionOrigin.APPLICATION) {
            const window = this.window;
            const {center, halfSize, state, hidden, frameEnabled, ...options} = delta;
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

            // Apply window frame
            if (frameEnabled !== undefined) {
                actions.push(frameEnabled ? window.enableFrame() : window.disableFrame());
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
                actions.push(window.updateOptions(options));
            }

            // Track these changes
            return this.addPendingActions('updateState ' + this.id + ' ' + JSON.stringify(delta), actions);
        }
    }

    public async bringToFront(): Promise<void> {
        return this.addPendingActions('bringToFront ' + this.id, this.window.bringToFront());
    }

    public async close(): Promise<void> {
        this.ready = false;
        return this.addPendingActions('close ' + this.id, this.window.close(true));
    }

    public async applyProperties(properties: Partial<WindowState>): Promise<void> {
        this.updateState(properties, ActionOrigin.SERVICE);
    }

    public async applyOverride<K extends keyof WindowState>(property: K, value: WindowState[K]): Promise<void> {
        if (value !== this.windowState[property]) {
            this.temporaryState[property] = this.temporaryState[property] || this.windowState[property];
            this.windowState[property] = value;

            return this.updateState({[property]: value}, ActionOrigin.SERVICE_TEMPORARY);
        }
    }

    public async resetOverride(property: keyof WindowState): Promise<void> {
        if (this.temporaryState.hasOwnProperty(property)) {
            const value = this.temporaryState[property]!;
            this.windowState[property] = value;
            return this.updateState({[property]: value}, ActionOrigin.SERVICE);  // TODO: Is this the right origin type?
        }
    }

    // tslint:disable-next-line:no-any
    public async sendMessage(action: WindowMessages, payload: any): Promise<void> {
        if (this.ready) {
            // TODO: Revisit this timeout after we bump to V.35
            // Current hypothesis is that, in sendToClient, we're trying to dispatch to a tabstrip that no longer
            // exists, but hasn't been removed from the .connections array.
            await Promise.race([apiHandler.sendToClient(this.identity, action, payload), new Promise((res) => setTimeout(res, 15))]);
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
        this.registerListener('begin-user-bounds-changing', this.handleBeginUserBoundsChanging.bind(this));
        this.registerListener('bounds-changed', this.handleBoundsChanged.bind(this));
        this.registerListener('bounds-changing', this.handleBoundsChanging.bind(this));
        this.registerListener('closed', this.handleClosed.bind(this));
        this.registerListener('disabled-frame-bounds-changed', this.handleDisabledFrameBoundsChanged.bind(this));
        this.registerListener('disabled-frame-bounds-changing', this.handleDisabledFrameBoundsChanging.bind(this));
        this.registerListener('focused', this.handleFocused.bind(this));
        this.registerListener('frame-disabled', () => {
            this.updateState({frameEnabled: false}, ActionOrigin.APPLICATION);
            this.onModified.emit(this);
        });
        this.registerListener('frame-enabled', () => {
            this.updateState({frameEnabled: true}, ActionOrigin.APPLICATION);
            this.onModified.emit(this);
        });
        this.registerListener('group-changed', this.handleGroupChanged.bind(this));
        this.registerListener('hidden', () => this.updateState({hidden: true}, ActionOrigin.APPLICATION));
        this.registerListener('maximized', () => {
            this.updateState({state: 'maximized'}, ActionOrigin.APPLICATION);
        });
        this.registerListener('minimized', () => {
            this.updateState({state: 'minimized'}, ActionOrigin.APPLICATION);
            this.snapGroup.windows.forEach(window => {
                if (window !== this) {
                    (window as DesktopWindow).applyProperties({state: 'minimized'});
                }
            });
        });
        this.registerListener('restored', () => {
            this.updateState({state: 'normal'}, ActionOrigin.APPLICATION);
            this.snapGroup.windows.forEach(window => {
                if (window !== this) {
                    if (this.tabGroup && window !== this.tabGroup.window) {
                        // Window will set a window to visible when minimizing. Need to restore window visibility.
                        (window as DesktopWindow).applyProperties({state: 'normal', hidden: true});
                    } else {
                        // Restore window, without affecting visibility
                        (window as DesktopWindow).applyProperties({state: 'normal'});
                    }
                }
            });
        });
        this.registerListener('shown', () => this.updateState({hidden: false}, ActionOrigin.APPLICATION));

        if (DesktopWindow.emulateDragEvents) {
            function disableFrame(this: DesktopWindow) {
                // Check window hasn't been closed/de-registered whilst we were waiting
                const isRegistered: boolean = this.model.getWindow(this.id) !== null;

                if (isRegistered && this.windowState.frameEnabled) {
                    console.log('Disabling frame on ' + this.id);

                    // Application isn't using 'disableFrame', safe for the service to enable it on behalf of the application
                    this.applyProperties({frameEnabled: false});

                    // Re-enable the frame if window window gets de-registered in the future
                    this.onTeardown.add(window => {
                        if (window.ready) {
                            window.window.enableFrame().catch(console.warn);
                        }
                    });
                } else if (isRegistered) {
                    console.log('Window has already disabled its frame ' + this.id);
                } else {
                    console.log('Window deregistered before frame check could occur ' + this.id);
                }
            }

            if (this.identity.uuid === TabServiceID.UUID) {
                // Can disable frame on tabstrips immediately, without waiting to see what application does.
                disableFrame.call(this);
            } else {
                // Wait and see what the application does, and then disable frame only if application hasn't already.
                setTimeout(disableFrame.bind(this), DesktopWindow.DISABLE_BOUNDS_DELAY);
            }
        }
    }

    private registerListener<K extends keyof fin.OpenFinWindowEventMap>(eventType: K, handler: (event: fin.OpenFinWindowEventMap[K]) => void) {
        this.window.addListener(eventType, handler);
        this.registeredListeners.set(eventType, handler);
    }

    private cleanupListeners(): void {
        const window: Window = this.window;

        for (const [key, listener] of this.registeredListeners) {
            window.removeListener(key, listener);
        }

        this.registeredListeners.clear();
    }

    private handleBoundsChanged(event: fin.WindowBoundsEvent): void {
        const bounds: fin.WindowBounds = this.checkBounds(event);
        const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
        const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

        this.updateState({center, halfSize}, ActionOrigin.APPLICATION);

        if (this.userInitiatedBoundsChange) {
            this.onCommit.emit(this, this.getTransformType(event));

            // Setting this here instead of in 'end-user-bounds-changing' event to ensure we are still synced when this method is called.
            this.userInitiatedBoundsChange = false;
        } else {
            this.onModified.emit(this);
        }
    }

    private handleBoundsChanging(event: fin.WindowBoundsEvent): void {
        const bounds: fin.WindowBounds = this.checkBounds(event);
        const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
        const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

        this.updateState({center, halfSize}, ActionOrigin.APPLICATION);

        if (this.userInitiatedBoundsChange) {
            this.onTransform.emit(this, this.getTransformType(event));
        }
    }

    private handleDisabledFrameBoundsChanged(event: fin.WindowBoundsEvent): void {
        const bounds: fin.WindowBounds = this.checkBounds(event);
        const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
        const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

        if (this.applicationState.frameEnabled) {
            // Service must move the window, as application (presumably) won't have registered any 'disabled-*' listeners registered
            this.updateState({center, halfSize}, ActionOrigin.SERVICE);
        }

        // Assume that all disabled-frame-bounds-* events are user-initiated
        this.onCommit.emit(this, this.getTransformType(event));
    }

    private handleDisabledFrameBoundsChanging(event: fin.WindowBoundsEvent): void {
        const bounds: fin.WindowBounds = this.checkBounds(event);
        const halfSize: Point = {x: bounds.width / 2, y: bounds.height / 2};
        const center: Point = {x: bounds.left + halfSize.x, y: bounds.top + halfSize.y};

        if (this.applicationState.frameEnabled) {
            // Service must move the window, as application (presumably) won't have registered any 'disabled-*' listeners registered
            this.updateState({center, halfSize}, ActionOrigin.SERVICE);
        }

        // Assume that all disabled-frame-bounds-* events are user-initiated
        this.onTransform.emit(this, this.getTransformType(event));
    }

    private getTransformType(event: fin.WindowBoundsEvent): Mask<eTransformType> {
        // Convert 'changeType' into our enum type
        return event.changeType + 1;
    }

    private handleBeginUserBoundsChanging(event: fin.WindowBoundsEvent) {
        this.userInitiatedBoundsChange = true;
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
        const group: fin.OpenFinWindow[] = await new Promise<fin.OpenFinWindow[]>((res, rej) => {
            window.getGroup(res, rej);
        });
        await promiseMap(group, async (groupWindow: fin.OpenFinWindow) => {
            return new Promise<void>((res, rej) => {
                groupWindow.bringToFront(res, rej);
            });
        });



        // V2 'getGroup' API has bug: https://appoji.jira.com/browse/RUN-4535
        // await this.window.getGroup().then((group: Window[]) => {
        //     return Promise.all(group.map((window: Window) => window.bringToFront()));
        // });
    }

    private handleGroupChanged(event: fin.WindowGroupChangedEvent): void {
        // Each group operation will raise an event from every window involved. To avoid handling the same event twice, we will only handle the event on the
        // window that triggered the event
        if (event.name !== event.sourceWindowName || event.uuid !== event.sourceWindowAppUuid) {
            return;
        }

        console.log('Received window group changed event: ', event);

        if (event.reason === 'leave') {
            // Remove window from its current group
            this.addToSnapGroup(new DesktopSnapGroup());
        } else {
            const targetWindow: DesktopWindow|null = this.model.getWindow({uuid: event.targetWindowAppUuid, name: event.targetWindowName});

            // Merge the groups
            if (targetWindow) {
                const targetGroup: DesktopSnapGroup = targetWindow.getSnapGroup();

                if (event.reason === 'merge') {
                    // When merging groups, we need to update all windows within the source window's group
                    const windowsInGroup: DesktopWindow[] = this.snapGroup.windows as DesktopWindow[];  // TODO: Test snap groups that contain tabs
                    windowsInGroup.forEach((window: DesktopWindow) => {
                        window.addToSnapGroup(targetGroup);
                    });
                } else {
                    // Add just the window that received the event to the target group
                    this.addToSnapGroup(targetGroup);
                }
            }
        }
    }
}
