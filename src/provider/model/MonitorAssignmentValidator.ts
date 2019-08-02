import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';
import {Debounced} from '../snapanddock/utils/Debounced';
import {Point} from '../snapanddock/utils/PointUtils';
import {WindowState} from '../../client/workspaces';

import {DesktopModel} from './DesktopModel';
import {DesktopEntity} from './DesktopEntity';
import {DesktopSnapGroup} from './DesktopSnapGroup';
import {MonitorAssignmentCalculator, SnapGroupResult, EntityResult} from './MonitorAssignmentCalculator';
import {DesktopTabGroup} from './DesktopTabGroup';
import {DesktopWindow} from './DesktopWindow';

export class MonitorAssignmentValidator {
    private _model: DesktopModel;

    private _validate: Debounced<() => Promise<void>, MonitorAssignmentValidator, []>;

    public constructor(model: DesktopModel) {
        this._model = model;

        this._validate = new Debounced(this.validateInternal, this);
    }

    public async validate(): Promise<void> {
        return this._validate.call();
    }

    public async validateInternal(): Promise<void> {
        const calculator = new MonitorAssignmentCalculator(this._model.monitors);

        const snapGroups = this.getSnapGroups();
        const entities = this.getEntities();

        const snapGroupResults = snapGroups.map(snapGroup => calculator.getMovedSnapGroupRectangles(snapGroup));
        const entityResults = entities.map(entity => calculator.getMovedEntityRectangle(entity));

        const moveSnapGroupsPromise = this.applySnapGroupResults(snapGroupResults);
        const moveEntitiesPromise = this.applyEntityResults(entityResults);

        await Promise.all([moveSnapGroupsPromise, moveEntitiesPromise]);
    }

    private getSnapGroups(): DesktopSnapGroup[] {
        return this._model.snapGroups.filter(snapGroup => snapGroup.isNonTrivial());
    }

    private getEntities(): DesktopEntity[] {
        const trivalSnapGroup = this._model.snapGroups.filter(snapGroup => !snapGroup.isNonTrivial());

        // Trivial snap groups should contain exactly one entity
        return trivalSnapGroup.map(trivalSnapGroup => trivalSnapGroup.entities[0]);
    }

    private async applySnapGroupResults(snapGroupResults: SnapGroupResult<DesktopEntity, DesktopSnapGroup>[]): Promise<void> {
        await Promise.all(snapGroupResults.map(async (snapGroupResult) => {
            await this.applySnapGroupResult(snapGroupResult.target, snapGroupResult.groupRectangle);

            // Apply results to each entity in snapgroup, as we may want to move it independently from group
            await this.applyEntityResults(snapGroupResult.entityResults);
        }));
    }

    private async applyEntityResults(entityResults: EntityResult<DesktopEntity>[]): Promise<void> {
        await Promise.all(entityResults.map(async (result: EntityResult<DesktopEntity>) => {
            return this.applyEntityResult(result.target, result.rectangle);
        }));
    }

    private async applySnapGroupResult(snapGroup: DesktopSnapGroup, rectangle: Rectangle): Promise<void> {
        const center = snapGroup.center;

        const offset = {x: rectangle.center.x - center.x, y: rectangle.center.y - center.y};

        if (offset.x !== 0 || offset.y !== 0) {
            await snapGroup.applyOffset(offset);
        }
    }

    private async applyEntityResult(entity: DesktopEntity, rectangle: Rectangle): Promise<void> {
        const offset = this.calculateOffset(entity, rectangle);
        const startState = entity.currentState.state;

        const maximizedBounds: Rectangle | undefined =
            startState === 'maximized' || (entity instanceof DesktopTabGroup && entity.isMaximized) ? entity.currentState : undefined;

        if (offset.x !== 0 || offset.y !== 0 || (maximizedBounds && !this.fillsScreen(maximizedBounds))) {
            if (entity.snapGroup.isNonTrivial()) {
                await entity.setSnapGroup(new DesktopSnapGroup());
            }

            if (entity instanceof DesktopTabGroup) {
                await this.applyTabGroupResult(entity, rectangle, offset);
            } else if (entity instanceof DesktopWindow) {
                await this.applyWindowResult(entity, startState, rectangle);
            }
        }
    }

    private async applyTabGroupResult(tabGroup: DesktopTabGroup, rectangle: Rectangle, offset: Point<number>) {
        if (tabGroup.isMaximized) {
            await tabGroup.resetMaximizedAndNormalBounds(rectangle);
        } else {
            await tabGroup.applyOffset(offset, rectangle.halfSize);
        }
    }

    private async applyWindowResult(window: DesktopWindow, startState: WindowState, rectangle: Rectangle) {
        let restoredState: WindowState | undefined;
        if (startState !== 'normal') {
            // We can't tell if we have a 'minimized, maximized' window without actually restoring
            await window.restore();
            restoredState = window.currentState.state;
        }

        // Note that Windows may have moved the window when restoring, so recalculate the offset. Also note this will restore a maximized window
        await window.applyOffset(this.calculateOffset(window, rectangle), rectangle.halfSize);

        // If we had a 'minimized, maximized' window, we restore that here
        if (restoredState === 'maximized') {
            await window.maximize();
        }

        if (startState !== 'normal') {
            await startState === 'maximized' ? window.maximize() : window.minimize();
        }
    }

    private calculateOffset(entity: DesktopEntity, rectangle: Rectangle): Point<number> {
        const center = entity.normalBounds.center;
        return {x: rectangle.center.x - center.x, y: rectangle.center.y - center.y};
    }

    private fillsScreen(rectangle: Rectangle): boolean {
        return this._model.monitors.some(monitor => RectUtils.isEqual(monitor, rectangle));
    }
}
