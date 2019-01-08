import {DesktopSnapGroup, Snappable} from './model/DesktopSnapGroup';
import {Preview, PreviewableTarget} from './Preview';
import {eTargetType, Target} from './WindowHandler';
import {DesktopEntity} from './model/DesktopEntity';

export class View {
    private activeGroup: DesktopSnapGroup|null;  // The group being moved
    private target: Target|null;                 // The current snap candidate (target may be valid or invalid. Will be null if there are no candidates)
    private preview: Preview;                    // For displaying where the active group will snap to (the red/green boxes)

    constructor() {
        this.activeGroup = null;
        this.target = null;
        this.preview = new Preview();
    }

    /**
     * This will be called every time the active group gets moved/resized, and again when the transformation ends (with
     * null for both args).
     *
     * This ensures that the active and target groups have the correct opacity effects applied, and updates the snap
     * preview.
     *
     * SnapView also stores these parameters as members. This allows it to revert the active/target windows to their
     * original opacities once the active/target group(s) change or get reset.
     */
    public update(activeGroup: DesktopSnapGroup|null, target: Target|null): void {
        if (target && target.type === eTargetType.EJECT) {
            activeGroup = target = null;
        }

        // Handle change of active group
        if (activeGroup !== this.activeGroup) {
            // Reset active window always on top property.
            this.setAlwaysOnTop(this.activeGroup, false);

            // Restore opacity of active group.
            this.setGroupOpacity(this.activeGroup, false);

            this.activeGroup = activeGroup;

            // Set the active window to always be on top.
            this.setAlwaysOnTop(this.activeGroup, true);

            // Apply opacity to active group.
            this.setGroupOpacity(this.activeGroup, true);
        }

        // Detect change of target group
        if ((this.target && this.isPreviewable(this.target) && this.target.group) !== (target && target.group)) {
            const targetGroup = this.target && this.isPreviewable(this.target) ? this.target.group :
                                                                                 null;  // && this.target.type !== eTargetType.EJECT ? this.target.group : null;

            // Reset alwaysOnTop override, as our activeGroup window is now in the target group.
            this.setAlwaysOnTop(targetGroup, false);

            // Restore opacity of previous target group (if any)
            this.setGroupOpacity(targetGroup, false);

            // Reduce opacity of new target group (if any)
            this.setGroupOpacity(target && target.group, true);
        }

        // Update preview window
        this.target = target;
        if (activeGroup && target && this.isPreviewable(target)) {
            this.preview.show(target);
        } else {
            this.preview.hide();
        }
    }

    private isPreviewable(target: Target|null): target is PreviewableTarget {
        return !!target && (target.type === eTargetType.SNAP || target.type === eTargetType.TAB);
    }

    private setGroupOpacity(group: DesktopSnapGroup|null, transparent: boolean): void {
        if (group) {
            if (transparent) {
                group.windows.forEach((window: DesktopEntity) => {
                    window.applyOverride('opacity', 0.8);
                });
            } else {
                group.windows.forEach((window: DesktopEntity) => {
                    window.resetOverride('opacity');
                });
            }
        }
    }

    /**
     * Applys alwaysOnTop to the primary window of a desktop snap group.  Required to keep the preview window in proper z-index order under the active window.
     * @param group The activeGroup being dragged by the user.
     * @param applyOnTop Apply alwaysOnTop or not.
     */
    private setAlwaysOnTop(group: DesktopSnapGroup|null, applyOnTop: boolean): void {
        if (group) {
            if (applyOnTop) {
                group.windows.forEach((window: DesktopEntity) => {
                    window.applyOverride('alwaysOnTop', true);
                });
            } else {
                group.windows.forEach((window: DesktopEntity) => {
                    window.resetOverride('alwaysOnTop');
                });
            }
        }
    }
}
