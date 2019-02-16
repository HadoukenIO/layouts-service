import {snapService, tabService} from './main';
import {DesktopEntity} from './model/DesktopEntity';
import {DesktopModel} from './model/DesktopModel';
import {DesktopSnapGroup} from './model/DesktopSnapGroup';
import {DesktopWindow, eTransformType, Mask} from './model/DesktopWindow';
import {SnapTarget} from './snapanddock/Resolver';
import {Point} from './snapanddock/utils/PointUtils';
import {DragWindowManager} from './tabbing/DragWindowManager';
import {EjectTarget, TabTarget} from './tabbing/TabService';
import {View} from './View';

/**
 * The existing interfaces for what a target can be.
 */
export type Target = SnapTarget|TabTarget|EjectTarget;

export enum eTargetType {
    TAB = 'TAB',
    SNAP = 'SNAP',
    EJECT = 'EJECT'
}

export interface TargetBase {
    type: eTargetType;

    /**
     * The window within the active group that was used to find this candidate.
     */
    activeWindow: DesktopEntity;

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
        const target = this.getTarget(activeGroup, type);

        this.view.update(target);
    }

    private onGroupCommit(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>) {
        const target = this.getTarget(activeGroup, type);

        this.view.update(null);

        if (target && target.valid) {
            if (target.type === eTargetType.TAB) {
                tabService.applyTabTarget(target);

            } else if (target.type === eTargetType.SNAP) {
                snapService.applySnapTarget(target);
            }
        }
    }

    private onTabDrag(window: DesktopWindow, mousePosition: Point) {
        const target = tabService.getTarget(window);
        this.view.update(target);
    }

    private onTabDrop(window: DesktopWindow) {
        this.view.update(null);

        const target = tabService.getTarget(window);

        if (target) {
            tabService.applyTabTarget(target);
        }
    }

    /**
     * Fetches the appropriate target from different services.
     * @param {DesktopSnapGroup} activeGroup The active group being moved by the user.
     */
    private getTarget(activeGroup: DesktopSnapGroup, type: Mask<eTransformType>): Target|null {
        const snapTarget: Target|null = snapService.getTarget(activeGroup);
        const tabTarget: Target|null = (type & eTransformType.RESIZE) === 0 ? tabService.getTarget(activeGroup.windows[0]) : null;

        return snapTarget || tabTarget;
    }
}