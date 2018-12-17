import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';

import {DesktopSnapGroup} from './DesktopSnapGroup';
import {DesktopTabGroup} from './DesktopTabGroup';
import {EntityState, WindowIdentity} from './DesktopWindow';

/**
 * Interface for anything that can be snapped - namely windows and tab sets. Represents any entity that should be 
 * considered as a single window for the purposes of snap & dock.
 */
export interface DesktopEntity {
    getId(): string;
    getIdentity(): WindowIdentity;

    getState(): EntityState;
    getTabGroup(): DesktopTabGroup|null;
    getSnapGroup(): DesktopSnapGroup;

    applyOverride<K extends keyof EntityState>(property: K, value: EntityState[K]): Promise<void>;
    resetOverride(property: keyof EntityState): Promise<void>;
    setSnapGroup(group: DesktopSnapGroup): Promise<void>;
    applyOffset(offset: Point, halfSize?: Point): Promise<void>;
}
