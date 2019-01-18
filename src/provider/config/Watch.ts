import {Scope} from '../../../gen/provider/config/scope';
import {Signal2} from '../Signal';

import {ConfigUtil, Mask} from './ConfigUtil';
import {ScopedConfig, Store} from './Store';

/**
 * Base class for the various types of 'watch' queries that are supported by the config store.
 *
 * To watch for config changes, create a watch object and then attach listeners to the signals on the watch object. The
 * watch will be automatically registered on the store as part of it's creation. To remove, use the methods on the
 * config store, or on the watch object itself.
 *
 * Note that watch objects can be added and removed to/from stores at any time. A removed store can be re-added if
 * desired. Whilst a watch will implicitly add itself to the store when created, there is no implicit removal of
 * watches at any time.
 */
export abstract class Watch<T> {
    /**
     * Signal fired whenever any config matching this watch is added to the store.
     *
     * NOTE: Within these callbacks, don't assume that all scopes matching `rule.scope` will now have `rule.config`
     * applied. There could be other rules within the store with higher precedence, that will override some or all of
     * the contents of `rule.config`.
     *
     * Arguments: (rule: ScopedConfig<T>, source: Scope)
     */
    public readonly onAdd: Signal2<ScopedConfig<T>, Scope> = new Signal2();

    /**
     * Signal fired whenever any config matching this watch is removed from the store.
     *
     * NOTE: Within these callbacks, don't assume that all scopes matching `rule.scope` will now have been modified. It
     * is possible that there were other rules within the store with higher precedence, which meant that the removed
     * rule wasn't having any impact on that item.
     *
     * Arguments: (rule: ScopedConfig<T>, source: Scope)
     */
    public readonly onRemove: Signal2<ScopedConfig<T>, Scope> = new Signal2();

    protected _store: Store<T>;

    constructor(store: Store<T>) {
        this._store = store;
        store.addWatch(this);
    }

    /**
     * Returns the store that this object applies to
     */
    public get store(): Store<T> {
        return this._store;
    }

    /**
     * Stub method for determining if a piece of config matches the watch query.
     *
     * The return value of this function determines if the store should emit one of the signals on the watch.
     *
     * @param config The config that is being added (or removed) to/from the store
     */
    public abstract matches(config: ScopedConfig<T>): boolean;

    /**
     * Removes this watch from it's associated store.
     *
     * If the watch has already been removed, this will have no effect.
     */
    public remove(): void {
        this._store.removeWatch(this);
    }
}

/**
 * A watch query that will fire whenever a config snippet that matches a scope is added/removed to the store.
 *
 * Note that this can only be used with scopes and not rules. This means the watch will only apply to a single
 * window/application/etc, and cannot be used with any regex expressions.
 */
export class ScopeWatch<T> extends Watch<T> {
    public readonly type: 'scope';
    public readonly scope: Scope;

    constructor(store: Store<T>, scope: Scope) {
        super(store);
        this.type = 'scope';
        this.scope = scope;
    }

    public matches(config: ScopedConfig<T>): boolean {
        // Validate the rule before evaluating it.
        // Validating first prevents console warnings if the rule is of a higher-level scope
        return ConfigUtil.ruleCanBeUsedInScope(config.scope, this.scope) && ConfigUtil.matchesRule(config.scope, this.scope);
    }
}

/**
 * A watch query that will fire whenever a config snippet that matches a mask is added/removed to the store.
 */
export class MaskWatch<T, M extends Mask<T>> extends Watch<T> {
    public readonly type: 'mask';
    public readonly mask: M;

    constructor(store: Store<T>, mask: M) {
        super(store);
        this.type = 'mask';
        this.mask = mask;
    }

    public matches(config: ScopedConfig<T>): boolean {
        return ConfigUtil.matchesMask<T, M>(config.config, this.mask);
    }
}

// For easier debugging of watch expressions. Will be removed before completion of feature.
(window as any)['ScopeWatch'] = ScopeWatch;  // tslint:disable-line:no-any
(window as any)['MaskWatch'] = MaskWatch;    // tslint:disable-line:no-any
