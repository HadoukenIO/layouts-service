import {InitialOptions} from './Service/state/store';
import {Edge} from './Service/utils/edge';
import {Point} from './Service/utils/point';
import {WindowIdentity} from './Service/utils/window';

// declarations



export type GroupId = number;



export enum Entity {
  Group = 'group',
  Window = 'window'
}

export interface BaseSnappingData { snapEdges: Edge[]; }
export interface BaseSnappableData extends BaseSnappingData {
  snapPoints: Point[];
}
export interface BaseSnapPointData extends BaseSnappingData {
  snapPoint: Point;
}
export interface WindowSnappingData extends BaseSnappingData {
  entity: Entity.Window;
  id: WindowIdentity;
}
export interface GroupSnappingData extends BaseSnappingData {
  entity: Entity.Group;
  id: GroupId;
}



export type SnapPointData =
    BaseSnapPointData&(WindowSnappingData|GroupSnappingData);
export type SnappableData =
    BaseSnappableData&(WindowSnappingData|GroupSnappingData);