import {RegEx, Rule} from '../../../gen/provider/config/layouts-config';
import {ApplicationScope, Scope, WindowScope} from '../../../gen/provider/config/scope';

/**
 * Defines the relative precedence of each available scope. The names of the constants match the `Scopes` type (and it
 * is important that all scopes are included in the enum). Because of this alignment, the enum can be used as a mapping
 * between `Scopes` values and precedence values.
 *
 * ```ts
 * const scope: Scopes = 'desktop';
 * const priority: number = ScopePrecedence[scope];
 * const scope2: Scopes = ScopePrecedence[priority] as Scopes;
 * ```
 *
 * Precedence rules are important, as it is expected that each rule passed to the store will only contain a small
 * subset of the available parameters. A query must always return a "full" config object with all parameters specified,
 * so these precedence levels determine the order in which the rules are applied in order to build the final config
 * object.
 *
 * The lower the number returned by this enum, the lower the priority of that scope - i.e. the smaller the number, the
 * more likely it is that config at that scope will get overridden by another rule.
 */
export enum ScopePrecedence {
    service = 0,
    desktop = 1,
    application = 2,
    window = 3
}

/**
 * Helper type - like the built-in `Required<T>` util, but will apply the modifier recursively, to any non-primitive
 * values within T.
 *
 * The helper contains one exception. Any 'rules' member will always be left unmodified, this is a work-around to allow
 * this util to work as intended with the `ConfigWithRules<T>` type.
 */
export type RequiredRecursive<T> = {
    [P in keyof T] -?: T[P] extends number|string|boolean|'rules' ? T[P] : RequiredRecursive<T[P]>;
};

/**
 * Helper type - takes any object type and transforms it into a "Mask" of that type.
 *
 * A mask type has all the same members as the original type, but all primitive values are replaced with `boolean`. Any
 * non-primitive values are masked in a recursive manner.
 *
 * These masks are for querying a limited subset of a config tree. The masks are used to specify which value(s) from
 * the "full" config object should be extracted and returned.
 *
 * Querying with a mask can reduce the amount of work required when querying, by not iterating through parts of the
 * config tree that aren't required by the callee.
 */
export type Mask<T> = {
    [P in keyof T]: T[P] extends number|string|boolean ? boolean : boolean|Mask<T[P]>;
};

/**
 * Represents a concrete type that has had a mask applied. The template argument T is the original type, and M is the
 * mask that was applied to T. To use this util, the mask type `M` must be known at compile-time. There is no way for
 * TypeScript to validate any masks that are specified during runtime.
 *
 * NOTE: The TypeScript to support masking can get rather complicated... Some parts of the utils for masking will use
 * `any` types, but these utils *are* type-safe, so long as the value used for the mask strictly matches type `M` (with
 * no missing or additional fields).
 */
export type Masked<T, M extends Mask<T>> = MaskedHelper<T, M, keyof T&keyof M>;
type MaskedHelper<T, M, K extends(keyof T)&(keyof M)> = {
    [P in K]: M[P] extends true ? (T[P] extends number|string|boolean ? T[P] : (M[P] extends Mask<T[P]>? Masked<T[P], M[P]>: never)) : never;
};

/**
 * Collection of miscellaneous utils for use with configuration, scopes and rules.
 */
export class ConfigUtil {
    /**
     * Tests if two scopes are exactly equal.
     *
     * {@link matchesScope} can be used as a "fuzzy" equality check, to check if any item that matches one scope will
     * also match the other.
     *
     * @param a First scope
     * @param b Second scope
     */
    public static scopesEqual(a: Scope, b: Scope): boolean {
        if (a.level !== b.level) {
            return false;
        } else {
            switch (a.level) {
                case 'application':
                    return a.uuid === (b as ApplicationScope).uuid;
                case 'window':
                    return a.uuid === (b as WindowScope).uuid && a.name === (b as WindowScope).name;
                default:
                    // No additional data to check
                    return true;
            }
        }
    }

    /**
     * Tests if two rules are "functionally" exactly equal.
     *
     * Check is performed in a way that allows for optional fields to evaluate as equal if one is undefined and the
     * other is defined but with the default value.
     *
     * @param a First rule
     * @param b Second rule
     */
    public static rulesEqual(a: Rule, b: Rule): boolean {
        function paramEqual(a: string|RegEx, b: string|RegEx): boolean {
            if (typeof a !== typeof b) {
                return false;
            } else if (typeof a === 'string') {
                return a === b;
            } else if (typeof b !== 'string') {  // Redudant since expression will always be true, but allows TypeScript to infer type of 'b'
                return a.expression === b.expression && (a.flags || '') === (b.flags || '') && (a.invert || false) === (b.invert || false);
            }
            return false;
        }

        if (a.level !== b.level) {
            return false;
        } else {
            switch (a.level) {
                case 'application':
                    return paramEqual(a.uuid, (b as ApplicationScope).uuid);
                case 'window':
                    return paramEqual(a.uuid, (b as WindowScope).uuid) && paramEqual(a.name, (b as WindowScope).name);
                default:
                    // No additional data to check
                    return true;
            }
        }
    }

    /**
     * Ensures that 'value' is compatible with the 'spec' scope.
     *
     * This means that any config with 'spec' scope will also apply to the 'value' scope.
     *
     * @param spec The "tester" scope - will assert that any item which matches 'value' will also match this scope
     * @param value The "subject" scope - will assert that this is a strict subset of the 'spec' scope
     */
    public static matchesScope(spec: Scope, value: Scope): boolean {
        const levelSpec: number = ScopePrecedence[spec.level];
        const levelValue: number = ScopePrecedence[value.level];

        if (levelSpec !== levelValue) {
            return levelSpec < levelValue;
        } else {
            return this.scopesEqual(spec, value);
        }
    }

    /**
     * Checks that `rule` is allowed to be defined within config with a source of `scope`.
     *
     * The service prevents config sources from specifying rules in scopes that are "higher" than the scope at which the
     * config is being loaded at. This util ensures the rule operates "at or below" the given scope.
     *
     * @param rule The rule being added to the store
     * @param scope The scope of whoever is trying to add this rule to the store
     */
    public static ruleCanBeAddedInScope(rule: Rule, scope: Scope): boolean {
        return ScopePrecedence[rule.level] >= ScopePrecedence[scope.level];
    }

    /**
     * Returns if `rule` applies to `scope`.
     *
     * Rules apply to the scope at which they are defined, and any scopes below that in the hierarchy. For example, an
     * 'application'-scoped rule's config should be applied to application and window scopes only, and not a query at
     * desktop or service scope.
     *
     * Rules can be used in any scope that exists "at-or-above" the scope at which it acts.
     *
     * @param rule The rule being considered for execution
     * @param scope The scope being queried
     */
    public static ruleCanBeUsedInScope(rule: Rule, scope: Scope): boolean {
        return ScopePrecedence[rule.level] <= ScopePrecedence[scope.level];
    }

    /**
     * Checks that 'scope' matches the given rule.
     *
     * @param rule The rule to execute
     * @param scope The scope to execute the rule on
     */
    public static matchesRule(rule: Rule, scope: Scope): boolean {
        if (!this.ruleCanBeUsedInScope(rule, scope)) {
            console.warn(`No way that a "${scope.level}" scope can pass a "${rule.level}" rule`);
            return false;
        } else {
            switch (rule.level) {
                case 'window':
                    const winScope = scope as WindowScope;

                    if (!this.checkPattern(rule.name, winScope.name)) {
                        return false;
                    } else if (rule.uuid && !this.checkPattern(rule.uuid, winScope.uuid)) {
                        return false;
                    }

                    return true;
                case 'application':
                    const appScope = scope as ApplicationScope;
                    if (rule.uuid && !this.checkPattern(rule.uuid, appScope.uuid)) {
                        return false;
                    }

                    return true;
                default:
                    return true;
            }
        }
    }

    /**
     * Tests if the value matches the given filter.
     *
     * @param filter A string or RegEx pattern to use to test 'value'
     * @param value The string to test against the given filter
     */
    public static checkPattern(filter: string|RegEx, value: string): boolean {
        if (!filter) {
            return true;
        } else if (typeof filter === 'string') {
            return filter === value;
        } else {
            const regex = new RegExp(filter.expression, filter.flags);
            return regex.test(value) === !filter.invert;
        }
    }

    public static deepCopy<T extends {}>(value: T): T {
        if (!(value instanceof Object)) {
            // Primitive value, no need to clone these
            return value;
        } else {
            // Start with a shallow copy of 'value'
            const out = Object.assign({}, value);

            // Recursively deep-copy each non-primitive child member
            for (const key in out) {
                if (out[key] instanceof Object) {
                    out[key] = ConfigUtil.deepCopy(out[key]);
                }
            }

            return out;
        }
    }

    public static deepAssign<T extends {}>(target: T, value: T): void {
        for (const key in value) {
            if (!target.hasOwnProperty(key)) {
                target[key] = ConfigUtil.deepCopy(value[key]);
            } else if (target[key] instanceof Object) {
                ConfigUtil.deepAssign(target[key], value[key]);
            } else {
                target[key] = value[key];
            }
        }
    }

    public static deepAssignMask<T extends {}, M extends Mask<T>>(target: Masked<T, M>, value: T, mask: M|boolean): void {
        const keys = Object.keys(mask instanceof Object ? mask : value) as (keyof T)[];

        if (mask === false) {
            return;
        }

        for (const key of keys) {
            if (value.hasOwnProperty(key) && ConfigUtil.inMask(mask, key)) {
                ConfigUtil.assignProp<T, M>(target, value, key as keyof T, mask);
            }
        }
    }

    /**
     * Returns true if ANY of the fields specified in 'mask' exist within 'value'.
     */
    public static matchesMask<T extends {}, M extends Mask<T>>(value: T, mask: M|boolean): boolean {
        if (mask instanceof Object) {
            const maskObj: M = mask as M;
            const keys = Object.keys(mask) as (keyof T)[];

            // Check if ANY of the keys within the mask exist within 'value'.
            return keys.findIndex((key: keyof T) => {
                const type = typeof maskObj[key];

                if (type === 'boolean') {
                    // Matches if mask is enabled, and corresponding property exists within value
                    return maskObj[key] && value.hasOwnProperty(key);
                } else if (type === 'object') {
                    // Recurse into sub-mask, unless property doesn't exist within value
                    return value.hasOwnProperty(key) ? this.matchesMask(value[key], maskObj[key]) : false;
                } else {
                    console.warn('Unexpected value found within mask:', mask, key);
                    return false;
                }
            }) >= 0;
        } else if (typeof mask === 'boolean') {
            // A mask of 'true' will always pass, a mask of 'false' will always fail
            return mask;
        } else {
            // Invalid mask
            console.warn('Unexpected value found within mask:', mask, 'when applying mask to', value);
            return false;
        }
    }

    private static assignProp<T extends {}, M extends Mask<T>>(target: Masked<T, M>, value: T, key: keyof T, mask: M|boolean): void {
        // The types get a bit complicated here, so a few "any"'s are required to prevent compile errors...
        // TypeScript can't figure out the type of T[key], since 'key' is a runtime argument.

        if (!(value[key] instanceof Object)) {
            // tslint:disable-next-line:no-any
            target[key] = value[key] as any;
        } else if (value[key]) {
            if (!target.hasOwnProperty(key)) {
                (target[key] as {}) = {};
            }

            // tslint:disable-next-line:no-any
            ConfigUtil.deepAssignMask<any, any>(target[key], value[key], typeof mask === 'object' ? mask[key] : mask);
        }
    }

    private static inMask<T>(mask: boolean|Mask<T>, key: keyof T): mask is Mask<T> {
        if (typeof mask === 'boolean') {
            return mask;
        } else {
            return (typeof mask[key] === 'object') || mask[key] === true;
        }
    }
}
