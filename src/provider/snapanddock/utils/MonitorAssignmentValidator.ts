import {DesktopModel} from '../../model/DesktopModel';
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
    }
}
