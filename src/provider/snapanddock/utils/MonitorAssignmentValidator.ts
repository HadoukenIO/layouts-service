import {DesktopModel} from '../../model/DesktopModel';
import {DesktopEntity} from '../../model/DesktopEntity';
import {DesktopSnapGroup} from '../../model/DesktopSnapGroup';

import {Rectangle} from './RectUtils';
import {MonitorAssignmentCalculator, SnapGroupResult, EntityResult} from './MonitorAssignmentCalculator';
import {Debounced} from './Debounced';

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

        const moveSnapGroupsPromise = this.applySnapGroupResults(snapGroups, snapGroupResults);
        const moveEntitiesPromise = this.applyEntityResults(entities, entityResults);

        await Promise.all([moveSnapGroupsPromise, moveEntitiesPromise]);
    }

    private getSnapGroups(): DesktopSnapGroup[] {
        return this._model.snapGroups.filter(snapGroup => snapGroup.isNonTrivial());
    }

    private getEntities(): DesktopEntity[] {
        return this._model.snapGroups.filter(snapGroup => !snapGroup.isNonTrivial()).flatMap(snapGroup => snapGroup.entities);
    }

    private async applySnapGroupResults(snapGroups: DesktopSnapGroup[], snapGroupResults: SnapGroupResult[]): Promise<void> {
        await Promise.all(snapGroupResults.map(async (snapGroupResult, snapGroupIndex : number) => {
            const snapGroup = snapGroups[snapGroupIndex];
            await this.applySnapGroupResult(snapGroup, snapGroupResult.groupRectangle);

            await this.applyEntityResults(snapGroup.entities, snapGroupResult.entityResults);
        }));
    }

    private async applyEntityResults(entities: DesktopEntity[], entityResults: EntityResult[]): Promise<void> {
        await Promise.all(entityResults.map(async (rectangle: Rectangle, entityIndex: number) => {
            const entity = entities[entityIndex];
            return this.applyEntityResult(entity, rectangle);
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
        const center = entity.currentState.center;

        const offset = {x: rectangle.center.x - center.x, y: rectangle.center.y - center.y};

        if (offset.x !== 0 || offset.y !== 0) {
            if (entity.snapGroup.isNonTrivial()) {
                await entity.setSnapGroup(new DesktopSnapGroup());
            }

            await entity.applyOverride('state', 'normal');
            await entity.applyOffset(offset, rectangle.halfSize);
            await entity.resetOverride('state');
        }
    }
}
