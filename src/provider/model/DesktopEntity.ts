import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';

import {Scope} from '../../../gen/provider/config/scope';

import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopTabGroup} from './DesktopTabGroup';
import {EntityState, WindowIdentity} from './DesktopWindow';

/**
 * Interface for anything that can be snapped - namely windows and tab sets. Represents any entity that should be
 * considered as a single window for the purposes of snap & dock.
 */
export interface DesktopEntity {
    /**
     * Concatenation of window UUID and name, a string that uniquely identifies this window.
     *
     * @see DesktopModel.getId
     */
    id: string;

    /**
     * The OpenFin identity for this entity.
     *
     * TabGroups are identified by the WindowIdentity of the tabstrip window.
     */
    identity: WindowIdentity;

    /**
     * As identity, but with an extra identifier that allows the config of this identity to be queried more easily.
     */
    scope: Scope;

    /**
     * The current cached state of this entity.
     *
     * This is updated by adding listeners to the underlying window object(s). Due to the asynchronous nature of window
     * operations, there is no guarantee that this state isn't stale, but this state is always updated as soon as is
     * possible.
     */
    currentState: EntityState;

    /**
     * The tab group to which this entity belongs, or null if the entity is not tabbed.
     *
     * TabGroups are also entities, and the `tabGroup` of these will always be itself.
     */
    tabGroup: DesktopTabGroup|null;

    /**
     * The snap group to which this entity belongs. An entity will always belong to exactly one snap group.
     *
     * If an entity isn't currently snapped to anything, it belongs to a snap group with just a single entity.
     */
    snapGroup: DesktopSnapGroup;

    /**
     * Overrides a single property on this entity. This change can then be reverted by calling `resetOverride` with
     * the same property name.
     *
     * @param property Property to change
     * @param value Value to apply. The type of this value must match the type of 'property'
     */
    applyOverride<K extends keyof EntityState>(property: K, value: EntityState[K]): Promise<void>;

    /**
     * Resets an override that was previously set using `applyOverride`.
     *
     * Has no effect if there is no override in place on that property, or if the override has already been reset.
     *
     * @param property The property to reset
     */
    resetOverride(property: keyof EntityState): Promise<void>;

    /**
     * Moves this entity into a new snap group.
     *
     * The change will immediately be applied to the model, and will trigger async operations to (re-)group the entity
     * at the OpenFin/window level.
     *
     * @param group The new snap group for this entity
     */
    setSnapGroup(group: DesktopSnapGroup): Promise<void>;

    /**
     * Will move and/or resize this entity. Both operations are performed using the centre of the entity as the reference point.
     *
     * If window needs to be resized from a different "anchor point", the `offset` value will need to be updated accordingly.
     *
     * @param offset Distance to move the entity by
     * @param halfSize Optional new (half)size of the entity
     */
    applyOffset(offset: Point, halfSize?: Point): Promise<void>;
}
