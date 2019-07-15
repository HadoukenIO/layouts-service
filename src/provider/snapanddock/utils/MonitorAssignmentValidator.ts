import {DesktopModel} from '../../model/DesktopModel';
import {DesktopEntity} from '../../model/DesktopEntity';
import {DesktopSnapGroup} from '../../model/DesktopSnapGroup';

import {Rectangle} from './RectUtils';
import {MonitorAssignmentCalculator} from './MonitorAssignmentCalculator';
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

        const entities = [...this._model.windows, ...this._model.tabGroups].filter(entity => !entity.snapGroup.isNonTrivial());
        const snapGroups = this._model.snapGroups.filter(snapGroup => snapGroup.isNonTrivial());

        const entityRectangles = entities.map(entity => calculator.getMovedEntityRectangle(entity));
        const snapGroupResults = snapGroups.map(snapGroup => calculator.getMovedSnapGroupRectangles(snapGroup));

        const moveEntitiesPromise = this.applyEntityResults(entities, entityRectangles);

        const moveSnapGroupsPromise = Promise.all(snapGroupResults.map(async (snapGroupResult, snapGroupIndex : number) => {
            if (snapGroupResult === 'unchanged') {
                return;
            } else {
                const snapGroup = snapGroups[snapGroupIndex];
                await this.applyEntityResults(snapGroup.entities, snapGroupResult.entityRectangles);

                // Remove moved entities *one at a time* from snap group
                for (let i = 0; i < snapGroup.entities.length; i++) {
                    const entity = snapGroup.entities[i];
                    const rectangle = snapGroupResult.entityRectangles[i];

                    if (rectangle !== 'unchanged') {
                        await entity.setSnapGroup(new DesktopSnapGroup());
                    }
                }
            }
        }));

        await Promise.all([moveEntitiesPromise, moveSnapGroupsPromise]);
    }

    private async applyEntityResults(entities: DesktopEntity[], rectanglesResults: (Rectangle | 'unchanged')[]): Promise<void> {
        await Promise.all(rectanglesResults.map(async (rectanglesResult: Rectangle | 'unchanged', entityIndex: number) => {
            if (rectanglesResult === 'unchanged') {
                return;
            } else {
                const entity = entities[entityIndex];
                const center = entity.currentState.center;

                const offset = {x: rectanglesResult.center.x - center.x, y: rectanglesResult.center.y - center.y};

                await entity.applyOffset(offset, rectanglesResult.halfSize);
                if (entity.snapGroup.isNonTrivial()) {
                    entity.setSnapGroup(new DesktopSnapGroup());
                }
            }
        }));
    }
}
