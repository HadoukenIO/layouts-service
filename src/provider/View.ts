import {PreviewConfig, Scope} from '../../gen/provider/config/layouts-config';

import {ConfigStore} from './main';
import {DesktopEntity} from './model/DesktopEntity';
import {DesktopSnapGroup} from './model/DesktopSnapGroup';
import {Preview, PreviewableTarget} from './Preview';
import {eTargetType, Target} from './WindowHandler';

type DesktopItem = DesktopEntity|DesktopSnapGroup;

export class View {
    private _preview: Preview;  // For displaying where the active group will snap to (the red/green boxes)
    private _targetItem: DesktopItem|null;
    private _activeItem: DesktopItem|null;

    private _config: ConfigStore;

    constructor(config: ConfigStore) {
        this._config = config;
        this._preview = new Preview();
        this._targetItem = null;
        this._activeItem = null;
    }

    /**
     * Updates target window and groups by applying opacity + z-indexing effects.  Also will call for positioning the preview window based on the target
     * supplied.
     */
    public update(target: Target|null): void {
        const activeGroup = target && target.activeWindow.snapGroup || null;

        let activeItem: DesktopItem|null = null;
        let targetItem: DesktopItem|null = null;

        if (target && activeGroup) {
            switch (target.type) {
                case eTargetType.SNAP:
                    activeItem = activeGroup;
                    targetItem = target.targetGroup;
                    break;
                case eTargetType.TAB:
                    if (target.targetWindow.tabGroup && target.activeWindow.tabGroup && target.targetWindow.tabGroup === target.activeWindow.tabGroup) {
                        targetItem = target.activeWindow.tabGroup.window;
                        activeItem = target.activeWindow.tabGroup.window;
                    } else {
                        targetItem = target.targetWindow;
                        activeItem = target.activeWindow;
                    }
                    break;
                case eTargetType.EJECT:
                    activeItem = null;
                    targetItem = null;
                    break;
                default:
                    activeItem = activeGroup;
            }
        } else {
            activeItem = null;
            targetItem = null;
        }

        if (activeItem !== this._activeItem) {
            this.setAlwaysOnTop(this._activeItem, false);

            this.setOpacity(this._activeItem, null, true);

            const bringActiveToFront = target !== null && !(target.type === eTargetType.TAB && target.tabDragging && activeItem !== targetItem);

            this.setAlwaysOnTop(activeItem, bringActiveToFront);

            this.setOpacity(activeItem, activeItem !== targetItem ? target : null, true);

            this._activeItem = activeItem;
        } else if ((this._activeItem === this._targetItem) !== (activeItem === targetItem)) {
            // Conditional for when we move from targeting the active window to another target. There are special
            // treatments needed for when we target the active window which are handled here.

            const bringActiveToFront = target !== null && !(target.type === eTargetType.TAB && target.tabDragging && activeItem !== targetItem);
            this.setAlwaysOnTop(activeItem, bringActiveToFront);
            this.setOpacity(activeItem, !bringActiveToFront ? target : null, true);
        }

        if (targetItem !== this._targetItem) {
            // sets opacity on activeItem if previous target was activeItem === targetItem
            if (this._targetItem !== activeItem) {
                this.setOpacity(this._targetItem, null, false);
            }

            this.setOpacity(targetItem, activeItem !== targetItem ? target : null, false);
        }

        this._targetItem = targetItem;

        if (activeItem && targetItem && activeItem !== targetItem) {
            this._preview.show(target! as PreviewableTarget);
        } else {
            this._preview.hide();
        }
    }

    private setAlwaysOnTop(entity: DesktopItem|null, onTop: boolean): void {
        if (entity) {
            if (entity instanceof DesktopSnapGroup) {
                entity.windows.forEach((window: DesktopEntity) => {
                    if (onTop) {
                        window.applyOverride('alwaysOnTop', true);
                    } else {
                        window.resetOverride('alwaysOnTop');
                    }
                });
            } else {
                if (onTop) {
                    entity.applyOverride('alwaysOnTop', true);
                } else {
                    entity.resetOverride('alwaysOnTop');
                }
            }
        }
    }

    private setOpacity(item: DesktopItem|null, target: Target|null, isActive: boolean): void {
        if (item) {
            if (!target || (target.type === eTargetType.SNAP || target.type === eTargetType.TAB)) {
                // Set window opacity to the level defined in config
                if (item instanceof DesktopSnapGroup) {
                    item.windows.forEach((entity: DesktopEntity) => {
                        this.setEntityOpacity(entity, target, isActive);
                    });
                } else {
                    this.setEntityOpacity(item.tabGroup || item, target, isActive);
                }
            }
        }
    }

    private setEntityOpacity(entity: DesktopEntity, target: Target|null, isActive: boolean): void {
        if (target) {
            const scope: Scope = entity.tabGroup ? entity.tabGroup.activeTab.scope : entity.scope;
            const previewType = eTargetType[target.type].toLowerCase() as 'snap'|'tab';
            const preview: Required<PreviewConfig> = this._config.query(scope).preview[previewType];
            const opacity: number|null = isActive ? preview.activeOpacity : preview.targetOpacity;

            if (opacity !== null) {
                entity.applyOverride('opacity', opacity);
            } else {
                entity.resetOverride('opacity');
            }
        } else {
            entity.resetOverride('opacity');
        }
    }
}
