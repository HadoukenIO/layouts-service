import {RegEx, Rule} from '../../../gen/provider/config/layouts-config';
import {Scope} from '../../../gen/provider/config/scope';

import {ConfigUtil, Mask, Masked, PartialRecursive, RequiredRecursive, scopePriorityLookup, scopePriorityMap} from './ConfigUtil';
import {Watch} from './Watch';

/**
 * Enum of available scope levels
 */
export type Scopes = Scope['level'];

export interface ScopedConfig<T> {
    scope: Rule;
    config: T;
}

interface StoredConfig<T> {
    source: Scope;
    rule: Rule;
    config: T;
}

type ConfigWithRules<T> = T&{
    rules?: ScopedConfig<T>[];
};

/**
 * A central config "database" that holds the default configuration of the service, and a number of
 * externally-specified overrides to those defaults.
 *
 * The store can be queried by a specific scope, and also supports watch queries/callbacks and queries of a specific
 * subset of the config struct.
 */
export class Store<T> {
    private _items: Map<Scopes, StoredConfig<T>[]>;
    private _cache: Map<string, RequiredRecursive<T>>;
    private _watches: Watch<T>[];

    constructor(defaults: RequiredRecursive<T>&ConfigWithRules<T>) {
        this._items = new Map();
        this._cache = new Map();
        this._watches = [];
        this.add({level: 'service'}, defaults);
    }

    /**
     * Adds a "chunk" of config to the central store.
     *
     * @param scope Default scope for any configuration at the "root" level
     * @param config Configuration that should be applied to 'scope', plus optional additional rules.
     */
    public add(scope: Scope, config: ConfigWithRules<T>): void {
        if (config.rules) {
            // Load each rule
            config.rules.forEach((rule: ScopedConfig<T>) => {
                if (ConfigUtil.ruleCanBeAddedInScope(rule.scope, scope)) {
                    this.addInternal(scope, rule.scope, rule.config);
                } else {
                    console.warn(`Ignoring ${this.getKey(rule.scope)} rule in config with scope ${this.getKey(scope)}`);
                }
            });

            // Remove rules array from default config
            config = Object.assign({}, config);
            delete config.rules;
        }

        // Load top-level config at the 'default' scope
        this.addInternal(scope, scope, config);
        this._cache.clear();
    }

    /**
     * Removes any configuration that originated from the given source.
     *
     * @param scope Identity of whatever source is now no longer available
     */
    public removeFromSource(source: Scope): void {
        this._items.forEach((values: StoredConfig<T>[]) => {
            const prevValues: StoredConfig<T>[] = values.slice();

            prevValues.forEach((item: StoredConfig<T>) => {
                if (ConfigUtil.scopesEqual(item.source, source)) {
                    const index: number = values.indexOf(item);

                    if (index >= 0) {
                        values.splice(index, 1);
                        this._cache.clear();
                        this.checkWatches({scope: item.rule, config: item.config}, 'onRemove');
                    } else {
                        console.warn('Config was removed whilst iterating over array, ignoring...');
                    }
                }
            });

            // NOTE: Some entries in this._items may now be empty, but will leave these in to remove any overhead of re-adding them later.
        });
    }

    /**
     * Adds a watch listener to this store. This listener's condition will be evaluated each time a piece of
     * configuration is added to or removed from the store, and the relevant signal on the watch will be fired if
     * it's condition matches the modified config snippet.
     *
     * Will have no effect if the listener has already been added to the store
     *
     * Watches can be removed using {@link removeWatch}, or {@link Watch.remove}.
     *
     * @param watch Pre-configured watch listener
     */
    public addWatch(watch: Watch<T>): void {
        const index: number = this._watches.indexOf(watch);

        if (watch.store !== this) {
            throw new Error('Cannot attach a watch listener that was created with a different store');
        } else if (index === -1) {
            this._watches.push(watch);
        } else {
            console.warn('addWatch: Watch already exists within store, ignoring...', watch);
        }
    }

    /**
     * Removes a previously-registered listener from the store.
     *
     * Has no effect if the given listener is invalid or has already been removed.
     *
     * @param watch Pre-configured watch listener
     */
    public removeWatch(watch: Watch<T>): void {
        const index: number = this._watches.indexOf(watch);

        if (index >= 0) {
            this._watches.splice(index, 1);
        } else {
            console.warn('removeWatch: Watch not present within store, ignoring...', watch);
        }
    }

    /**
     * Queries the store to pull-together every piece of configuration that has been registered for the given scope.
     *
     * These snippets are then merged together based on the priorities of the config scopes (priorities are determined
     * by scope, see {@link scopePriorityMap}).
     *
     * The object returned by this method is guaranteed to always be a "full" 'T' object, where all fields are
     * included. Whilst it is expected that config added via {@link add} will always be "partial" config (with only a
     * small subset of the supported config parameters being used), the store will always hold a "full" set of
     * fall-back values, and these 'defaults' will fill-in any gaps with the `add`-ed config.
     *
     * For performance reasons, the results of all queries are cached within the store. This cached is flushed whenever
     * config is added or removed. This caching policy assumes that config snippets will be added/removed at a much
     * lower frequency than queries on the config store, and that repeat queries are likely within normal usage.
     *
     * @param scope The scope of the item whose configuration is required
     */
    public query(scope: Scope): RequiredRecursive<T> {
        const result: RequiredRecursive<T> = {} as RequiredRecursive<T>;
        const key: string = this.getKey(scope);

        if (this._cache.has(key)) {
            return this._cache.get(key)!;
        } else {
            for (let i = 0, scopeIndex = scopePriorityMap.get(scope.level)!; i <= scopeIndex; i++) {
                const rulesAtScope: StoredConfig<T>[] = this._items.get(scopePriorityLookup[i]) || [];
                const applicableRules: StoredConfig<T>[] = rulesAtScope.filter(rule => ConfigUtil.matchesRule(rule.rule, scope));

                if (applicableRules.length === 1) {
                    ConfigUtil.deepAssign<T>(result as T, applicableRules[0].config);
                } else if (applicableRules.length > 1) {
                    const sortedRules: StoredConfig<T>[] = this.applyPrecedenceRules(applicableRules);

                    sortedRules.forEach((config: StoredConfig<T>) => {
                        ConfigUtil.deepAssign<T>(result as T, config.config);
                    });
                }
            }

            this._cache.set(key, result);

            return result;
        }
    }

    /**
     * Like {@link query}, but will only return a subset of the fields within `T`. If the mask is small, this can
     * reduce the amount of work required to resolve the query, as it isn't necessary to recurse into parts of `T` that
     * aren't needed by the code requesting the query.
     *
     * There is a caveat to masks, however. The results of these queries will not be cached - meaning that using masks
     * for any query that is called frequently may result in more work being required.
     *
     * @param scope The scope of the item whose configuration is required
     * @param mask A mask that specifies which fields of `T` should be returned. See {@link Mask<T>}
     */
    public queryPartial<M extends Mask<T>>(scope: Scope, mask: M): Masked<T, M> {
        const result: Masked<T, M> = {} as Masked<T, M>;

        const priority = scopePriorityMap.get(scope.level)!;
        for (let i = 0; i <= priority; i++) {
            const scopedLayouts: StoredConfig<T>[]|undefined = this._items.get(scopePriorityLookup[i]);

            if (scopedLayouts) {
                scopedLayouts.forEach((config: StoredConfig<T>) => {
                    if (ConfigUtil.matchesRule(config.rule, scope)) {
                        ConfigUtil.deepAssignMask<T, M>(result, config.config as T, mask);
                    }
                });
            }
        }

        return result;
    }

    private addInternal(source: Scope, rule: Rule, config: T /*PartialRecursive<T>*/): void {
        let itemsWithScope: StoredConfig<T>[]|undefined = this._items.get(rule.level);
        if (!itemsWithScope) {
            itemsWithScope = [];
            this._items.set(rule.level, itemsWithScope);
        }

        const scopedConfig: StoredConfig<T> = {source, rule, config};
        itemsWithScope.push(scopedConfig);

        this.checkWatches({scope: rule, config}, 'onAdd');
    }

    private applyPrecedenceRules(applicableRules: StoredConfig<T>[]): StoredConfig<T>[] {
        /**
         * Precedence rules are as follows (highest priority first):
         *   - Whichever rule has the highest-precedence scope (as determined by `scopePriorityMap`)
         *   - Whichever rule has the highest-precedence source (as determined by `scopePriorityMap`)
         *   - Whichever rule has the most-specific scope (scope with the fewest regex parameters, applies only to application/window scopes)
         *   - Whichever rule was most-recently added
         */
        return applicableRules.sort((a: StoredConfig<T>, b: StoredConfig<T>) => {
            if (a.rule.level !== b.rule.level) {
                // Sort by rule scope
                return scopePriorityMap.get(a.rule.level)! - scopePriorityMap.get(b.rule.level)!;
            } else if (a.source.level !== b.source.level) {
                // Sort by source scope
                return scopePriorityMap.get(a.source.level)! - scopePriorityMap.get(b.source.level)!;
            } else if (this.getSpecifity(a.rule) !== this.getSpecifity(b.rule)) {
                // Sort by rule specifity
                return this.getSpecifity(a.rule) - this.getSpecifity(b.rule);
            } else {
                // As a last-resort, sort by most-recently-added.
                // The input array will already be in date order, so use a comparator that produces stable-sort behaviour.
                return applicableRules.indexOf(a) - applicableRules.indexOf(b);
            }
        });
    }

    private getSpecifity(rule: Rule): number {
        switch (rule.level) {
            case 'application':
                return (typeof rule.uuid === 'string') ? 1 : 0;
            case 'window':
                return ((typeof rule.uuid === 'string') ? 1 : 0) + ((typeof rule.name === 'string') ? 1 : 0);
            default:
                // Specifity doesn't really apply to other scope types
                return 0;
        }
    }

    private checkWatches(config: ScopedConfig<T>, signal: 'onAdd'|'onRemove'): void {
        this._watches.forEach((watch: Watch<T>) => {
            if (watch[signal].slots.length > 0 && watch.matches(config)) {
                watch[signal].emit(this, config);
            }
        });
    }

    /**
     * Takes a scope and converts it to a string that can be used as a cache key, or in logging output.
     *
     * @param scope The scope/rule to stringify
     */
    private getKey(scope: Rule|Scope): string {
        function stringifyParam(param: string|RegEx): string {
            if (typeof param === 'string') {
                return param;
            } else {
                return `${param.invert ? '!' : ''}/${param.expression}/${param.flags || ''}`;
            }
        }

        switch (scope.level) {
            case 'application':
                return `${scope.level}:${stringifyParam(scope.uuid)}`;
            case 'window':
                return `${scope.level}:${stringifyParam(scope.uuid)}/${stringifyParam(scope.name)}`;
            default:
                return scope.level;
        }
    }
}
