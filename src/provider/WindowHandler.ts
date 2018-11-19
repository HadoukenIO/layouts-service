import { DesktopSnapGroup, Snappable } from "./model/DesktopSnapGroup";
import { Mask, eTransformType, DesktopWindow } from "./model/DesktopWindow";
import { snapService, tabService } from "./main";
import { DesktopModel } from "./model/DesktopModel";
import { eSnapValidity } from "./snapanddock/Resolver";
import { Point } from "./snapanddock/utils/PointUtils";
import { SnapView } from "./snapanddock/SnapView";

/**
 * Interface that represents a valid candidate group for the group that the user is currently manipulating.
 *
 * As a window is dragged around, it is possible that it will be within the snapping distance of several other groups.
 * The service will create a SnapTarget for each possible snap candidate, and then select the "best" candidate as
 * being the current target. The selected target will then be passed to the UI for rendering/highlighting.
 */
export interface Target {
    type: "TAB" | "SNAP"
    /**
     * The group that has been selected as the snap candidate.
     *
     * This is not the group that the user is currently dragging, it is the group that has been selected as the snap
     * target.
     */
    group: DesktopSnapGroup;

    /**
     * The window within the active group that was used to find this candidate
     */
    activeWindow: Snappable;

    /**
     * The offset that will be applied to the active group, in order to correctly align it with this target.
     */
    snapOffset: Point;

    /**
     * If 'activeWindow' should be resized as part of this snap, it's new halfSize will be specified here. This only
     * happens when the active group contains a single window, and the two closest corners of that window are both
     * within the anchor distance of the corresponding corners of the candidate window.
     *
     * Will be null if we don't want the window to resize as part of the snap.
     */
    halfSize: Point|null;

    /**
     * A snap target is always generated for any groups within range of the target window.
     */
    validity: eSnapValidity;
}

export interface TabTarget extends Target {
    type: "TAB"
}

export interface SnapTarget extends Target {
    type: "SNAP"
}


export class WindowHandler {
    private model: DesktopModel;
    private view: SnapView;

    constructor(model: DesktopModel){
        this.model = model;
        this.view = new SnapView();

        // Register lifecycle listeners
        DesktopSnapGroup.onCreated.add(this.onSnapGroupCreated, this);
        DesktopSnapGroup.onDestroyed.add(this.onSnapGroupDestroyed, this);
    }

    private onSnapGroupCreated(group: DesktopSnapGroup): void {
        group.onTransform.add(this.onGroupTransform, this);
        group.onCommit.add(this.onGroupCommit, this);
    }

    private onSnapGroupDestroyed(group: DesktopSnapGroup): void {
        group.onTransform.remove(this.onGroupTransform, this);
        group.onCommit.remove(this.onGroupCommit, this);
    }

    private onGroupTransform(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>) {
        const groups: ReadonlyArray<DesktopSnapGroup> = this.model.getSnapGroups();
        const snapTarget: SnapTarget|null = snapService.resolver.getSnapTarget(groups, activeGroup);
        const tabTarget = activeGroup.windows.length === 1 && tabService.getTarget(activeGroup);

        this.view.update(activeGroup, tabTarget || snapTarget);
    }

    private onGroupCommit(activeGroup: DesktopSnapGroup) {
        snapService.applySnapTarget(activeGroup);
        this.view.update(null, null);
    }

}