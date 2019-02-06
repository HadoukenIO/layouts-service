import {Window} from 'hadouken-js-adapter';
import {WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';
import {WindowDetail, WindowInfo} from 'hadouken-js-adapter/out/types/src/api/system/window';

import {ConfigurationObject, RegEx, Rule} from '../../../gen/provider/config/layouts-config';
import {Scope, WindowScope} from '../../../gen/provider/config/scope';

import {ConfigUtil, Masked} from '../config/ConfigUtil';
import {ScopedConfig} from '../config/Store';
import {MaskWatch} from '../config/Watch';
import {ConfigStore} from '../main';
import {DesktopSnapGroup} from '../model/DesktopSnapGroup';
import {SignalSlot} from '../Signal';
import {Point} from '../snapanddock/utils/PointUtils';
import {RectUtils} from '../snapanddock/utils/RectUtils';

import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow, EntityState, WindowIdentity} from './DesktopWindow';
import {MouseTracker} from './MouseTracker';
import {ZIndexer} from './ZIndexer';

type EnabledMask = {
    enabled: true
};
const enabledMask: EnabledMask = {
    enabled: true
};

export class DesktopModel {
    private _config: ConfigStore;
    private _watch: MaskWatch<ConfigurationObject, {enabled: boolean}>;

    private _windows: DesktopWindow[];
    private _tabGroups: DesktopTabGroup[];
    private _snapGroups: DesktopSnapGroup[];
    private _windowLookup: {[key: string]: DesktopWindow};
    private _zIndexer: ZIndexer;
    private _mouseTracker: MouseTracker;

    constructor(config: ConfigStore) {
        this._windows = [];
        this._tabGroups = [];
        this._snapGroups = [];
        this._windowLookup = {};
        this._zIndexer = new ZIndexer(this);
        this._mouseTracker = new MouseTracker();

        DesktopWindow.onCreated.add(this.onWindowCreated, this);
        DesktopWindow.onDestroyed.add(this.onWindowDestroyed, this);
        DesktopTabGroup.onCreated.add(this.onTabGroupCreated, this);
        DesktopTabGroup.onDestroyed.add(this.onTabGroupDestroyed, this);
        DesktopSnapGroup.onCreated.add(this.onSnapGroupCreated, this);
        DesktopSnapGroup.onDestroyed.add(this.onSnapGroupDestroyed, this);

        const serviceUUID: string = fin.Application.me.uuid;

        // Set built-in rules for determining if a window should be registered
        const errorWindowSpec: RegEx = {expression: 'error-app-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}', flags: 'g'};
        config.addRule({level: 'service'}, {level: 'application', uuid: serviceUUID}, {enabled: false});
        config.addRule({level: 'service'}, {level: 'window', uuid: serviceUUID, name: {expression: 'Placeholder-.*'}}, {enabled: true});
        config.addRule({level: 'service'}, {level: 'application', uuid: errorWindowSpec}, {enabled: false});

        // Add watch expressions for detecting config changes
        this._config = config;
        this._watch = new MaskWatch(config, {enabled: true});
        this._watch.onAdd.add(this.onRuleAdded, this);
        this._watch.onRemove.add(this.onRuleRemoved, this);

        // Listen for any new windows created and register them with the service
        fin.System.addListener('window-created', (evt: WindowEvent<'system', 'window-created'>) => {
            this.addIfEnabled({uuid: evt.uuid, name: evt.name});
        });

        // Register any windows created before the service started
        fin.System.getAllWindows().then(apps => {
            apps.forEach((app) => {
                // Register the main window
                this.addIfEnabled({uuid: app.uuid, name: app.mainWindow.name});

                // Register all of the child windows
                app.childWindows.forEach((child) => {
                    this.addIfEnabled({uuid: app.uuid, name: child.name});
                });
            });
        });

        // Validate everything on monitor change, as groups may become disjointed
        fin.System.addListener('monitor-info-changed', async () => {
            // Validate all tabgroups
            this.tabGroups.map(g => g.validate());

            // Validate all snap groups
            this.snapGroups.map(g => g.validate());
        });
    }

    public get mouseTracker(): MouseTracker {
        return this._mouseTracker;
    }

    public get windows(): ReadonlyArray<DesktopWindow> {
        return this._windows;
    }

    public get tabGroups(): ReadonlyArray<DesktopTabGroup> {
        return this._tabGroups;
    }

    public get snapGroups(): ReadonlyArray<DesktopSnapGroup> {
        return this._snapGroups;
    }

    public getId(identity: WindowIdentity): string {
        return `${identity.uuid}/${identity.name}`;
    }

    /**
     * Fetches the model object for the given window, or null if no window currently exists within the service.
     *
     * Window to find can be identified by
     *
     * @param identity Window identifier - either a UUID/name object, or a stringified identity as created by @see getId
     */
    public getWindow(identity: WindowIdentity|string): DesktopWindow|null {
        const id = typeof identity === 'string' ? identity : this.getId(identity);
        return this._windows.find(window => window.id === id) || null;
    }

    public getWindowAt(x: number, y: number, exclude?: WindowIdentity): DesktopWindow|null {
        const point: Point = {x, y};
        const excludeId: string|undefined = exclude && this.getId(exclude);
        const windowsAtPoint: DesktopWindow[] = this._windows.filter((window: DesktopWindow) => {
            const state: EntityState = window.currentState;
            return window.isActive && RectUtils.isPointInRect(state.center, state.halfSize, point) && window.id !== excludeId;
        });

        return this._zIndexer.getTopMost(windowsAtPoint);
    }

    public getTabGroup(id: string): DesktopTabGroup|null {
        return this._tabGroups.find(group => group.id === id) || null;
    }

    /**
     * Re-registers the target window with the service, "white-listing" the window for use with the service for the
     * lifecycle of whichever window requested that the target be registered.
     *
     * @param target Window to register
     * @param source Which window requested `target` to be registered (can be any window, including `target`)
     */
    public register(target: WindowIdentity, source: Scope): void {
        const targetScope: Scope = {level: 'window', ...target};

        console.log('Registering', target, 'from', source);

        // Only need to add a rule to the config store. The model's watch listener will handle any resulting register.
        // This also ensures that the window remains registered for the lifecycle of whichever window requested this action.
        this._config.addRule(source, targetScope, {enabled: true});
    }

    /**
     * De-registers the target window from the service, and "black-lists" the window from being registered for the
     * lifecycle of whichever window requested that the target be de-registered.
     *
     * @param target Window to de-register
     * @param source Which window requested `target` to be de-registered (can be any window, including `target`)
     */
    public deregister(target: WindowIdentity, source: Scope): void {
        const targetScope: Scope = {level: 'window', ...target};

        console.log('Deregistering', target, 'from', source);

        // Only need to add a rule to the config store. The model's watch listener will handle any resulting de-register.
        // This also ensures that the window remains de-registered for the lifecycle of whichever window requested this action.
        this._config.addRule(source, targetScope, {enabled: false});
    }

    /**
     * Waits for a window with the given identity to be registered, then returns the DesktopWindow object for that
     * window. If the window already exists at the point where this function is called, the promise is resolved
     * immediately.
     *
     * By default the promise will time-out after a short delay, and the promise will be rejected. Set a timeout of
     * zero to wait indefinitely.
     *
     * @param identity The window that we are waiting to be registered
     * @param timeout How long we should wait, in milliseconds
     */
    public expect(identity: WindowIdentity, timeout = 1000): Promise<DesktopWindow> {
        let slot: SignalSlot|null = null;
        const windowPromise: Promise<DesktopWindow> = new Promise((resolve, reject) => {
            const window: DesktopWindow|null = this.getWindow(identity);
            const id = this.getId(identity);

            if (window) {
                resolve(window);
            } else {
                slot = DesktopWindow.onCreated.add((window: DesktopWindow) => {
                    if (window.id === id) {
                        slot!.remove();
                        resolve(window);
                    }
                });
            }
        });

        let promiseWithTimeout: Promise<DesktopWindow>;
        if (timeout > 0) {
            // Wait at-most 'timeout' milliseconds
            promiseWithTimeout = Promise.race([windowPromise, new Promise<DesktopWindow>((res, rej) => setTimeout(rej, timeout))]);
        } else {
            // Wait indefinitely
            promiseWithTimeout = windowPromise;
        }

        // Ensure we remove callback when promise resolves/rejects
        const removeSlot = (window: DesktopWindow) => {
            if (slot) {
                slot.remove();
            }
            return window;
        };
        return promiseWithTimeout.then(removeSlot, removeSlot);
    }

    private async addIfEnabled(identity: WindowIdentity): Promise<void> {
        const result: Masked<ConfigurationObject, EnabledMask> =
            this._config.queryPartial({level: 'window', uuid: identity.uuid, name: identity.name}, enabledMask);

        if (result.enabled) {
            await this.addWindow(identity);
        }
    }

    private addWindow(identity: WindowIdentity): Promise<DesktopWindow|null> {
        // Check that the service does not already have a matching window
        const existingWindow: DesktopWindow|null = this.getWindow(identity);

        // The runtime will not allow multiple windows with the same uuid/name, so if we receive a
        // window-created event for a registered window, it implies that our internal state is stale
        // and should be updated accordingly.
        if (existingWindow) {
            existingWindow.teardown();
        }

        const window: Window = fin.Window.wrapSync(identity);
        return DesktopWindow.getWindowState(window).then<DesktopWindow|null>((state: EntityState): DesktopWindow|null => {
            if (!this._config.queryPartial({level: 'window', ...identity}, enabledMask).enabled) {
                // An 'enabled: false' rule was added to the store whilst we were in the process of setting-up the
                // DesktopWindow. We'll bail here with a warning rather than continuing with the window registration.
                console.log('Ignoring window as it was de-registered whilst querying it\'s state', identity);
                return null;
            } else {
                // Create new window object. Will get registered implicitly, due to signal within DesktopWindow constructor.
                console.log('Registered window: ' + this.getId(identity));
                return new DesktopWindow(this, new DesktopSnapGroup(), window, state);
            }
        });
    }

    private removeWindow(window: DesktopWindow): void {
        try {
            window.teardown();
        } catch (error) {
            console.error(`Unexpected error when deregistering: ${error}`);
            throw new Error(`Unexpected error when deregistering: ${error}`);
        }
    }

    private onRuleAdded(rule: ScopedConfig<ConfigurationObject>, source: Scope): void {
        const isEnabled: boolean = rule.config.enabled!;
        this.handleRuleChange(rule.scope, isEnabled);
    }

    private onRuleRemoved(rule: ScopedConfig<ConfigurationObject>, source: Scope): void {
        const isEnabled: boolean = rule.config.enabled!;
        this.handleRuleChange(rule.scope, !isEnabled);
    }

    /**
     * Callback for when any rule affecting the `enabled` property is added to or removed from the store.
     *
     * Adding/removing rules in this way should immediately apply those effects. This means we may need to deregister a
     * previously-registered window, or we may need to register a previously-deregistered window.
     *
     * We handle both adding and removing rules with the same callback, as there's no "one to one" relationship
     * between adding/removing rules and adding/removing windows. Adding a rule can result in both register and
     * deregister actions, as can removing a rule.
     *
     * @param rule Rule defining which windows were (possibly) affected
     * @param addWindows Determines if this rule change will be _adding_ windows to the model (`true`), or _removing_ them (`false`)
     */
    private async handleRuleChange(rule: Rule, addWindows: boolean): Promise<void> {
        if (addWindows) {
            // Find which currently de-registered windows match this rule
            const allWindows: WindowScope[] = ((await fin.System.getAllWindows()).reduce<WindowScope[]>((scopes: WindowScope[], info: WindowInfo) => {
                scopes.push({level: 'window', uuid: info.uuid, name: info.mainWindow.name});
                info.childWindows.forEach((child: WindowDetail) => {
                    scopes.push({level: 'window', uuid: info.uuid, name: child.name});
                });
                return scopes;
            }, []));
            const windowsToAdd: WindowScope[] = allWindows.filter((candidate: WindowScope) => {
                // Register window if it: matches the rule, isn't already registered, and isn't in the pending list
                return ConfigUtil.matchesRule(rule, candidate) && this._config.queryPartial(candidate, enabledMask).enabled &&
                    !this._windows.some((window: DesktopWindow) => window.identity.uuid === candidate.uuid && window.identity.name === candidate.name);
            });

            // Register any previously de-registered windows that match this rule
            await Promise.all(windowsToAdd.map(identity => this.addWindow(identity)));
        } else {
            // Find which existing windows match this rule
            const windowsToRemove: DesktopWindow[] = this._windows.filter((window: DesktopWindow) => {
                const windowScope: Scope = window.scope;

                // First check that window matches rule, then also perform a query. There could be other higher-precedence rules that override `rule`.
                // We check windowScope against the rule first to avoid querying the store unnecessarily - likely only a very small subset of windows will
                // actually match the rule.
                return ConfigUtil.matchesRule(rule, windowScope) && !this._config.queryPartial(windowScope, enabledMask).enabled;
            });

            // De-register any previously registered windows that match this rule
            await Promise.all(windowsToRemove.map(async (window, index) => {
                this.removeWindow(window);
            }));
        }
    }

    private onWindowCreated(window: DesktopWindow): void {
        const id: string = window.id;

        if (this._windowLookup[id]) {
            console.warn('Adding a new window with an existing ID', window);
            this.onWindowDestroyed(this._windowLookup[id]);
        }

        this._windows.push(window);
        this._windowLookup[id] = window;
    }

    private onWindowDestroyed(window: DesktopWindow): void {
        const id: string = window.id;
        const index: number = this._windows.indexOf(window);

        if (index >= 0) {
            this._windows.splice(index, 1);
            delete this._windowLookup[id];
        } else if (this._windowLookup[id]) {
            console.warn('A window existed within lookup, but now window list', window);
            delete this._windowLookup[id];
        }
    }

    private onTabGroupCreated(group: DesktopTabGroup): void {
        this._tabGroups.push(group);
    }

    private onTabGroupDestroyed(group: DesktopTabGroup): void {
        const index: number = this._tabGroups.indexOf(group);

        if (index >= 0) {
            // Can only remove empty groups. Otherwise, things will break.
            if (group.tabs.length !== 0) {
                console.warn('Removing a non-empty tab group, this should never happen', group);
            }
            this._tabGroups.splice(index, 1);
        }
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        this._snapGroups.push(group);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        const index: number = this._snapGroups.indexOf(group);

        if (index >= 0) {
            // Can only remove empty groups. Otherwise, things will break.
            if (group.length !== 0) {
                console.warn('Removing a non-empty snap group, this should never happen', group);
            }
            this._snapGroups.splice(index, 1);
        }
    }

    private isErrorWindow(uuid: string): boolean {
        return /error-app-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/g.test(uuid);
    }
}
