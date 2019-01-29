import {RegEx, Rule} from '../../../gen/provider/config/layouts-config';
import {Scope} from '../../../gen/provider/config/scope';

import {ConfigUtil, Mask, Masked, RequiredRecursive, ScopePrecedence} from './ConfigUtil';
import {Watch} from './Watch';

/**
 * Enum of available scope levels
 */
export type Scopes = Scope['level'];

export interface ScopedConfig<T> {
    scope: Rule;
    config: T;
}

/**
 * A config object, with an optional list of rules to be applied on top.
 *
 * This type is what developers can add to their application manifests. The top-level `T` object will be applied to
 * the application and all of it's windows, and the developer can also additionally define one or more rules that
 * apply additional snippets to a scope of their choosing.
 *
 * ```json
 * "services": [{
 *     "name": "layouts",
 *     "config": {
 *         "param1": "value1",
 *         "param2": "value2",
 *         "rules": [{
 *             "scope": {"level": "window", "name": "launcher"},
 *             "config": {
 *                 "param1": "valueA",
 *                 "param2": "valueB"
 *             }
 *         }, {
 *             "scope": {"level": "window", "name": {"expression": "popup-.*"}},
 *             "config": {
 *                 "param1": "valueX",
 *                 "param2": "valueY"
 *             }
 *         }]
 *     }
 * }]
 * ```
 */
type ConfigWithRules<T> = T&{
    rules?: ScopedConfig<T>[];
};

/**
 * An entry within the config store. The store will track the source of every item added to the store, the rule that
 * defines what that config applies to, and the actual config data itself.
 *
 * When querying, these entries will be applied on top of each other, from lowest priority to highest, to gradually
 * build-up an object that combines configuration data from many sources.
 */
interface StoredConfig<T> {
    /**
     * The source of this config object. Typically an 'application' scope, as it is expected most config will come from
     * `app.json` files. Could also be desktop for anything set by a desktop owner, or window for anything set via a
     * client API call.
     */
    source: Scope;

    /**
     * A rule that defines when the config data within this object should be applied. When querying the store, it is
     * this rule that determines if this entry contributes to the object that is returned by the store.
     *
     * For any config that doesn't explicitly define a rule (for example, "top-level" config within an application
     * manifest), this will be the same as source.
     */
    scope: Rule;

    /**
     * The config data itself. This will typically be a "partial" object, that only specifies a small subset of the
     * available config options.
     */
    config: T;
}

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
     * Adds a single rule to the store without having to wrap it in a `ConfigWithRules` object.
     *
     * For example, the following function calls are both equivalent:
     * ```ts
     * store.add(source, {rules: [{
     *    scope: rule,
     *    config
     * }]});
     *
     * store.addRule(source, rule, config);
     * ```
     *
     * @param source The entity requesting this rule be added. Determines the lifecycle/"ownership" of the rule
     * @param rule A rule/filter that determines to which entities 'config' applies
     * @param config The set of options that should be applied to any entity matching 'rule'
     */
    public addRule(source: Scope, rule: Rule, config: T): void {
        // Only add the rule if `source` is allowed to add config of this scope
        if (ConfigUtil.ruleCanBeAddedInScope(rule, source)) {
            this.addInternal(source, rule, config);
        } else {
            console.warn(`Ignoring ${this.getKey(rule)} rule in config with scope ${this.getKey(source)}`);
        }
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
                        this.checkWatches(item, 'onRemove');
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
     * by scope, see {@link ScopePrecedence}).
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
            for (let i = 0, scopeIndex = ScopePrecedence[scope.level]; i <= scopeIndex; i++) {
                const rulesAtScope: StoredConfig<T>[] = this._items.get(ScopePrecedence[i] as Scopes) || [];
                const applicableRules: StoredConfig<T>[] = rulesAtScope.filter(rule => ConfigUtil.matchesRule(rule.scope, scope));

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

        const priority = ScopePrecedence[scope.level];
        for (let i = 0; i <= priority; i++) {
            const rulesAtScope: StoredConfig<T>[] = this._items.get(ScopePrecedence[i] as Scopes) || [];
            const applicableRules: StoredConfig<T>[] = rulesAtScope.filter(rule => ConfigUtil.matchesRule(rule.scope, scope));

            if (applicableRules) {
                applicableRules.forEach((config: StoredConfig<T>) => {
                    if (ConfigUtil.matchesRule(config.scope, scope)) {
                        ConfigUtil.deepAssignMask<T, M>(result, config.config as T, mask);
                    }
                });
            }
        }

        return result;
    }

    private addInternal(source: Scope, rule: Rule, config: T): void {
        let itemsWithScope: StoredConfig<T>[]|undefined = this._items.get(rule.level);
        if (!itemsWithScope) {
            itemsWithScope = [];
            this._items.set(rule.level, itemsWithScope);
        }

        const scopedConfig: StoredConfig<T> = {source, scope: rule, config};
        const existingConfig: StoredConfig<T>|undefined = itemsWithScope.find((config: StoredConfig<T>) => {
            return ConfigUtil.scopesEqual(source, config.source) && ConfigUtil.rulesEqual(rule, config.scope);
        });

        if (existingConfig) {
            // Can "collapse" the new config into the existing entry, rather than appending the new entry to the end of itemsWithScope
            ConfigUtil.deepAssign(existingConfig.config, config);
        } else {
            // No matching config to merge this with; push on the end
            itemsWithScope.push(scopedConfig);
        }

        // Even if config was "collapsed", use `scopedConfig` here to ensure watches fire correctly.
        // It's important that we only trigger watches based on `config` - and not `existingConfig.config`
        this.checkWatches(scopedConfig, 'onAdd');
    }

    /**
     * Sorts the given rules by priority, according to rule precedence logic. Sorted rules are returned as a new array.
     *
     * Precedence rules are as follows (highest priority first):
     *   • Whichever rule has the highest-precedence scope (as determined by `ScopePrecedence`)
     *   • Whichever rule has the highest-precedence source (as determined by `ScopePrecedence`)
     *   • Whichever rule has the most-specific scope (see {@link getSpecifity} for details)
     *   • Whichever rule was most-recently added
     *
     * @param applicableRules List of rules that should be sorted
     */
    private applyPrecedenceRules(applicableRules: StoredConfig<T>[]): StoredConfig<T>[] {
        return applicableRules.sort((a: StoredConfig<T>, b: StoredConfig<T>) => {
            if (a.scope.level !== b.scope.level) {
                // Sort by rule scope
                return ScopePrecedence[a.scope.level] - ScopePrecedence[b.scope.level];
            } else if (a.source.level !== b.source.level) {
                // Sort by source scope
                return ScopePrecedence[a.source.level] - ScopePrecedence[b.source.level];
            } else if (this.getSpecifity(a.scope) !== this.getSpecifity(b.scope)) {
                // Sort by rule specifity
                return this.getSpecifity(a.scope) - this.getSpecifity(b.scope);
            } else {
                // As a last-resort, sort by most-recently-added.
                // The input array will already be in date order, so use a comparator that produces stable-sort behaviour.
                return applicableRules.indexOf(a) - applicableRules.indexOf(b);
            }
        });
    }

    /**
     * Returns a number that indicates how "specific" `rule` is.
     *
     * Specifity is defined by the number of regexes within the rule - more regexes makes the rule broader, or more
     * generic; fewer regexes makes the rule narrower, or more specific.
     *
     * Specifity is a concept that only applies to scopes that have parameters. Non-parameterised scopes (e.g. desktop)
     * will always return 0. For this reason, comparing specifity values across scopes doesn't make much sense, this
     * metric is only really useful when comparing two rules of the same scope.
     *
     * @param rule Rule to quantify
     */
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

    /**
     * Checks for any active watches that match the given config, and then dispatch the specified signal on the watch.
     *
     * @param config A config rule that has just been added or removed
     * @param signal The action performed to `config` - defines which signal on the watch will be emitted
     */
    private checkWatches(config: StoredConfig<T>, signal: 'onAdd'|'onRemove'): void {
        this._watches.forEach((watch: Watch<T>) => {
            if (watch[signal].slots.length > 0 && watch.matches(config)) {
                const {source, ...rule} = config;
                watch[signal].emit(rule, source);
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
