import {snapService, tabService} from './main';
import {DesktopModel} from './model/DesktopModel';
import {DesktopSnapGroup, Snappable} from './model/DesktopSnapGroup';
import {DesktopWindow, eTransformType, Mask} from './model/DesktopWindow';
import {SnapTarget} from './snapanddock/Resolver';
import {TabTarget} from './tabbing/TabService';
import {View} from './View';
import { DragWindowManager } from './tabbing/DragWindowManager';
import { Point } from './snapanddock/utils/PointUtils';

/**
 * The existing interfaces for what a target can be.
 */
export type Target = SnapTarget|TabTarget;

export enum eTargetType {
    TAB = 'TAB',
    SNAP = 'SNAP'
}

export interface TargetBase {
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
     * The validity of the target.  This will produce visual feedback indicating if the move is accepted or not.
     */
    valid: boolean;
}

/**
 * A top level service class which handles window (snapgroup) transforms and commits.  Allows for multiple services to utilize signals without being nested in
 * the snap service.
 */
export class WindowHandler {
    private model: DesktopModel;
    private view: View;

    constructor(model: DesktopModel) {
        this.model = model;
        this.view = new View();

        DragWindowManager.onDragOver.add(this.onTabDrag, this);
        DragWindowManager.onDragDrop.add(this.onTabDrop, this);
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
        this.view.update(activeGroup, this.getTarget(activeGroup));
    }

    private onGroupCommit(activeGroup: DesktopSnapGroup) {
        const target = this.getTarget(activeGroup);

        if (target) {
            if (target.type === eTargetType.TAB) {
                // TODO: Change this to accept a target (SERVICE-279)
                tabService.tabDroppedWindow(activeGroup.windows[0] as DesktopWindow);
            } else if (target.type === eTargetType.SNAP) {
                snapService.applySnapTarget(target);
            }
        }

        this.view.update(null, null);
    }

    private onTabDrag(window: DesktopWindow, mousePosition: Point) {
        const activeGroup = window.getSnapGroup();
        const target = tabService.getTarget(activeGroup);
        this.view.update(activeGroup, target);
    }

    private onTabDrop(window: DesktopWindow, mousePosition: Point) {
        this.view.update(null, null);
    }

    /**
     * Fetches the appropriate target from different services.
     * @param {DesktopSnapGroup} activeGroup The active group being moved by the user.
     */
    private getTarget(activeGroup: DesktopSnapGroup): Target|null {
        const snapTarget: Target|null = snapService.getTarget(activeGroup);
        const tabTarget: Target|null = tabService.getTarget(activeGroup);

        return snapTarget || tabTarget;
    }
}