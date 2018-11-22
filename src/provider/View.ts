import {DesktopSnapGroup, Snappable} from './model/DesktopSnapGroup';
import {Preview} from './Preview';
import {Target} from './WindowHandler';

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
        if ((this.target && this.target.group) !== (target && target.group)) {
            // Restore opacity of previous target group (if any)
            this.setGroupOpacity(this.target && this.target.group, false);

            // Reduce opacity of new target group (if any)
            this.setGroupOpacity(target && target.group, true);
        }

        // Update preview window
        this.target = target;
        if (activeGroup && target) {
            this.preview.show(target);
        } else {
            this.preview.hide();
        }
    }

    private setGroupOpacity(group: DesktopSnapGroup|null, transparent: boolean): void {
        if (group) {
            if (transparent) {
                group.windows.forEach((window: Snappable) => {
                    window.applyOverride('opacity', 0.8);
                });
            } else {
                // group.windows[0].applyOverride('alwaysOnTop', false);
                group.windows.forEach((window: Snappable) => {
                    window.resetOverride('opacity');
                });
            }
        }
    }

    /**
     * Applys alwaysOnTop to the primary window of a desktop snap group.  Required to keep the preview window in proper z-index order under the active window.
     * @param {DesktopSnapGroup} group The activeGroup being dragged by the user.
     * @param {boolean} applyOnTop Apply alwaysOnTop or not.
     */
    private setAlwaysOnTop(group: DesktopSnapGroup|null, applyOnTop: boolean): void {
        if (group && group.windows[0]) {
            if (applyOnTop) {
                group.windows[0].applyOverride('alwaysOnTop', true);
            } else {
                group.windows[0].resetOverride('alwaysOnTop');
            }
        }
    }
}
