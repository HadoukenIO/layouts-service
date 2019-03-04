import {DesktopEntity} from './model/DesktopEntity';
import {DesktopSnapGroup} from './model/DesktopSnapGroup';
import {Preview, PreviewableTarget} from './Preview';
import {eTargetType, Target} from './WindowHandler';

type DesktopItem = DesktopEntity|DesktopSnapGroup;

export class View {
    private _preview: Preview;  // For displaying where the active group will snap to (the red/green boxes)
    private _targetItem: DesktopItem|null;
    private _activeItem: DesktopItem|null;

    constructor() {
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

        let activeItem: DesktopItem|null = null, targetItem: DesktopItem|null = null;

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

            this.setOpacity(this._activeItem, false);

            const bringActiveToFront = target !== null && !(target.type === eTargetType.TAB && target.tabDragging && activeItem !== targetItem);

            this.setAlwaysOnTop(activeItem, bringActiveToFront);

            this.setOpacity(activeItem, activeItem !== targetItem);

            this._activeItem = activeItem;
        } else if ((this._activeItem === this._targetItem) !== (activeItem === targetItem)) {
            // Conditional for when we move from targeting the activewindow to another target.  There are special treatments needed for when we target the
            // activewindow which are handled here.

            const bringActiveToFront = target !== null && !(target.type === eTargetType.TAB && target.tabDragging && activeItem !== targetItem);
            this.setAlwaysOnTop(activeItem, bringActiveToFront);
            this.setOpacity(activeItem, !bringActiveToFront);
        }

        if (targetItem !== this._targetItem) {
            // sets opacity on activeItem if previous target was activeItem === targetItem
            if (this._targetItem !== activeItem) {
                this.setOpacity(this._targetItem, false);
            }

            this.setOpacity(targetItem, activeItem !== targetItem);
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

    private setOpacity(entity: DesktopItem|null, transparent: boolean): void {
        if (entity) {
            if (entity instanceof DesktopSnapGroup) {
                entity.windows.forEach((window: DesktopEntity) => {
                    if (transparent) {
                        window.applyOverride('opacity', 0.8);
                    } else {
                        window.resetOverride('opacity');
                    }
                });
            } else {
                if (transparent) {
                    (entity.tabGroup || entity).applyOverride('opacity', 0.8);
                } else {
                    (entity.tabGroup || entity).resetOverride('opacity');
                }
            }
        }
    }
}
