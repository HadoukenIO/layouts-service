import {SnapPointData} from '../../types';
import {getGroup, getWindow, GroupStateMember} from '../state/store';

import {Edge, edgeSubtraction, intersects, isOverlapping, isSameEdge, makeCorresponds} from './edge';
import {Point} from './point';
import {Bounds, WindowIdentity} from './window';

export function mergeEntities(entities: GroupStateMember[]):
    GroupStateMember[] {
  const merged = entities.reduce((accum, entity) => {
    for (let i = 0; i < accum.length; i++) {
      const otherEntity = accum[i];
      const tryMerge = mergeTwoEntities(entity, otherEntity);
      if (tryMerge.length === 1) {
        return [...accum.slice(0, i), ...tryMerge, ...accum.slice(i + 1)];
      }
    }
    return [...accum, entity];
  }, [] as GroupStateMember[]);
  return merged.length < entities.length ? mergeEntities(merged) : merged;
}

export function mergeTwoEntities(
    entity1: GroupStateMember, entity2: GroupStateMember): GroupStateMember[] {
  if (!entity1.edges.some(
          e1 => entity2.edges.some(e2 => isOverlapping(e1, e2)))) {
    // If no edge overlaps the other
    return [entity1, entity2];
  }
  // Check for conflict here?
  if (entity1.edges.some(e1 => entity2.edges.some(e2 => intersects(e1, e2)))) {
    return [entity1, entity2];
  }
  return [{
    windows: entity1.windows.concat(entity2.windows),
    edges: mergeEdges(entity1.edges, entity2.edges)
  }];
}

export function recalculateGroupBounds(windows: WindowIdentity[]) {
  return mergeEntities(
      windows.map(id => ({edges: getWindow(id).edges, windows: [id]})));
}

export function willCollideOnSnap(
    snapPointData: SnapPointData, bounds: Bounds&WindowIdentity) {
  if (typeof snapPointData.id === 'number') {
    const group = getGroup(snapPointData.id);
    const snapPoint = snapPointData.snapPoint;
    return group.edges.some(edge => {
      const res = (edge.start.x < snapPoint.x + bounds.width &&
                   edge.start.y < snapPoint.y + bounds.height) &&
          (edge.end.x > snapPoint.x && edge.end.y > snapPoint.y);
      if (res) console.log('will collide');
      return res;
    });
  } else {
    return false;
  }
}

export function mergeEdges(previous: Edge[], incoming: Edge[]): Edge[] {
  if (incoming.length === 0) {
    return previous;
  }
  const edge = incoming[0];
  const corresponds = makeCorresponds(edge);
  const match = previous.find(corresponds);
  const next = incoming.slice(1);
  if (!match) {
    return mergeEdges([...previous, edge], next);
  }
  const newEdges = edgeSubtraction(match, edge);
  if (newEdges.length === 2 && isSameEdge(newEdges[0], match) &&
      isSameEdge(newEdges[0], edge)) {
    throw new Error('invalid edge combo in mergeedges');
  }
  // Will need to add test to make sure new edges !==[match,edge]
  return mergeEdges(
      previous.filter(x => !corresponds(x)), next.concat(newEdges));
}