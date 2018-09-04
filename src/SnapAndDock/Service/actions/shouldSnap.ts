import {Entity, SnappableData} from '../../types';
import {isSnappableEdge} from '../config';
import {getAllGroups, getAllWindows} from '../state/store';
import {Edge, EdgeType} from '../utils/edge';
import {willCollideOnSnap} from '../utils/group';
import {identityMatch} from '../utils/index';
import {createInsideSnapRegion, isSamePoint, Point} from '../utils/point';
import {Bounds, WindowIdentity} from '../utils/window';

export function shouldSnapTo(identity: WindowIdentity, bounds: Bounds) {
  // TBD:  HANDLE SNAPPING TO MORE THAN ONE GROUP / WINDOW
  // currently only top-left corner

  const snapPoint = {x: bounds.left, y: bounds.top};

  const snappablePointsByEntity: SnappableData[] = [];
  getAllGroups().forEach((group) => {
    const groupId = group.id;
    const snapEdges: Edge[] = group.edges.filter(isSnappableEdge)
                                  .filter(createInsideSnapRegion(snapPoint));
    const snapPoints = snapEdges.reduce((acc: Point[], edge) => {
      return acc.some(pt => isSamePoint(pt, edge.start)) ? acc :
                                                           [...acc, edge.start];
      // check any opposite bounds to ensure there is no collision
      // works for any snap point / edges & currently does not snap
      // if collision
    }, []);
    snappablePointsByEntity.push(
        {entity: Entity.Group, id: groupId, snapPoints, snapEdges});
  });

  getAllWindows().forEach((win) => {
    if (win.groupId || win.state !== 'normal' || win.hidden ||
        win.deregistered || identityMatch(win.identity, identity)) {
      return;
    }
    const snapEdges = win.edges.filter(isSnappableEdge)
                          .filter(createInsideSnapRegion(snapPoint));
    const snapPoints = snapEdges.reduce((acc: Point[], edge) => {
      return acc.some(pt => isSamePoint(pt, edge.start)) ? acc :
                                                           [...acc, edge.start];
      // check any opposite bounds to ensure there is no collision
      // works for any snap point / edges & currently does not snap if collision
    }, []);
    snappablePointsByEntity.push(
        {entity: Entity.Window, id: win.identity, snapPoints, snapEdges});
  });

  // TBD: HANDLE multiple potential snaps
  const snappablePoints =
      snappablePointsByEntity.filter(({snapPoints}) => snapPoints.length);

  if (!snappablePoints.length) {
    return false;
  }
  // RETURN x,y and do this in handleboundschanged
  if (snappablePoints.length > 1 || snappablePoints[0].snapPoints.length > 1) {
    console.log('tried to snap to 1+ pt - picking one', snappablePoints);
    // return false;
  }
  return snappablePoints.length ?
      {...snappablePoints[0], snapPoint: snappablePoints[0].snapPoints[0]} :
      false;
}