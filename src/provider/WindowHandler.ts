import { DesktopSnapGroup, Snappable } from "./model/DesktopSnapGroup";
import { Mask, eTransformType, DesktopWindow } from "./model/DesktopWindow";
import { snapService, tabService } from "./main";
import { DesktopModel } from "./model/DesktopModel";
import { Point } from "./snapanddock/utils/PointUtils";
import { SnapView } from "./snapanddock/SnapView";

export enum eTargetType {
    TAB = "TAB",
    SNAP = "SNAP"
}
/**
 * Interface that represents a valid candidate group for the group that the user is currently manipulating.
 *
 * As a window is dragged around, it is possible that it will be within the snapping distance of several other groups, or the abiltiy to be tabbed.
 * The service will create a Target for each possible snap & tab candidate, and then select the "best" candidate as
 * being the current target. The selected target will then be passed to the UI for rendering/highlighting.
 */
export interface Target {
    /**
     * The type that this target represents.
     */
    type: eTargetType;

    /**
     * The group that has been selected as the target candidate.
     *
     * This is not the group that the user is currently dragging, it is the group that has been selected as the target.
     */
    group: DesktopSnapGroup;

    /**
     * The window within the active group that was used to find this candidate.
     */
    activeWindow: Snappable;

    /**
     * The offset that will be applied to the active window, in order to correctly align it with this target.
     */
    offset: Point;

    /**
     * If 'activeWindow' should be resized as part of this snap, it's new halfSize will be specified here. This only
     * happens when the active group contains a single window, and the two closest corners of that window are both
     * within the anchor distance of the corresponding corners of the candidate window.
     *
     * Will be null if we don't want the window to resize as part of the snap.
     */
    halfSize: Point|null;

    /**
     * The validity of the target.  This will produce visual feedback indicating if the move is accepted or not.
     */
    valid: boolean;
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
        const snapTarget: Target|null = snapService.resolver.getSnapTarget(groups, activeGroup);
        const tabTarget = activeGroup.windows.length === 1 && tabService.getTarget(activeGroup);

        this.view.update(activeGroup, tabTarget || snapTarget);
    }

    private onGroupCommit(activeGroup: DesktopSnapGroup) {
        const groups: ReadonlyArray<DesktopSnapGroup> = this.model.getSnapGroups();
        const snapTarget: Target|null = snapService.resolver.getSnapTarget(groups, activeGroup);
        const tabTarget = activeGroup.windows.length === 1 && tabService.getTarget(activeGroup);
        
        if(tabTarget){
            const activeWindow: DesktopWindow = activeGroup.windows[0] as DesktopWindow;
            tabService.tabDroppedWindow(activeWindow);
        } else if(snapTarget){
            snapService.applySnapTarget(activeGroup);
        }

        this.view.update(null, null);
    }

}