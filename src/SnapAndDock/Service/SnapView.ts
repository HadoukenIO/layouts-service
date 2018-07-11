import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';

import {SnapTarget} from './Resolver';
import {SnapGroup} from './SnapGroup';
import {SnapPreview} from './SnapPreview';

export class SnapView {
    private activeGroup: SnapGroup|null;  // The group being moved
    private target: SnapTarget|null;      // The current snap candidate (target may be valid or invalid. Will be null if there are no candidates)
    private preview: SnapPreview;         // For displaying where the active group will snap to (the red/green boxes)

    constructor() {
        this.activeGroup = null;
        this.target = null;
        this.preview = new SnapPreview();
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
    public update(activeGroup: SnapGroup|null, target: SnapTarget|null): void {
        if (activeGroup && target) {
            if (!this.target || this.target.group !== target.group) {
                this.setTargetOpacity(this.target, 1.0);
                this.setTargetOpacity(target, 0.8);
            }
            this.preview.show(target);
        } else {
            this.setTargetOpacity(this.target, 1.0);
            this.preview.hide();
        }

        this.target = target;
    }

    private setTargetOpacity(target: SnapTarget|null, opacity: number) {
        if (target) {
            for (let index = 0; index < target!.group.windows.length; index++) {
                const groupWindow = target!.group.windows[index].getWindow();
                groupWindow.updateOptions({opacity});
            }
        }
    }
}
