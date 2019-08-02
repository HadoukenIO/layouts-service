import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';
import {MIN_OVERLAP, ADJACENCY_FUZZ_DISTANCE} from '../snapanddock/Constants';

type DesktopEntity<T> = {currentState: Rectangle & {hidden: boolean}} & T;

export function getContiguousEntities<T = {}>(entities: DesktopEntity<T>[]): T[][] {
    const contiguousSets: DesktopEntity<T>[][] = [];
    const disjointEntities: DesktopEntity<T>[] = [];

    // Extract any overlapping entities into trivial groups
    for (let i = 0; i < entities.length; i++) {
        const testEntity = entities[i];
        let overlapping = false;

        for (let j = 0; j < entities.length; j++) {
            if (j !== i && areOverlapping(testEntity, entities[j])) {
                overlapping = true;
                break;
            }
        }

        if (!overlapping) {
            disjointEntities.push(testEntity);
        } else {
            contiguousSets.push([testEntity]);
        }
    }

    const adjacencyList: DesktopEntity<T>[][] = new Array<DesktopEntity<T>[]>(disjointEntities.length);

    // Build adjacency list
    for (let i = 0; i < disjointEntities.length; i++) {
        adjacencyList[i] = [];
        for (let j = 0; j < disjointEntities.length; j++) {
            if (j !== i && isAdjacent(disjointEntities[i], disjointEntities[j])) {
                adjacencyList[i].push(disjointEntities[j]);
            }
        }
    }

    // Find all contiguous sets
    const unvisited: DesktopEntity<T>[] = disjointEntities.slice();

    while (unvisited.length > 0) {
        const visited: DesktopEntity<T>[] = [];
        depthFirstSearch(unvisited[0], visited);
        contiguousSets.push(visited);
    }

    return contiguousSets;

    function depthFirstSearch(startEntity: DesktopEntity<T>, visited: DesktopEntity<T>[]) {
        const startIndex = disjointEntities.indexOf(startEntity);
        if (visited.includes(startEntity)) {
            return;
        }
        visited.push(startEntity);
        unvisited.splice(unvisited.indexOf(startEntity), 1);
        for (let i = 0; i < adjacencyList[startIndex].length; i++) {
            depthFirstSearch(adjacencyList[startIndex][i], visited);
        }
    }
}

/**
 * Are the two DesktopEntitys adjacent? True if they are both visible and within the fuzz distance, false otherwise.
 * @param entity1 one DesktopEntity
 * @param entity2 the other DesktopEntity
 * @returns true if they are adjacent
 */
function isAdjacent<T>(entity1: DesktopEntity<T>, entity2: DesktopEntity<T>): boolean {
    const distance = RectUtils.distance(entity1.currentState, entity2.currentState);
    if (entity1.currentState.hidden || entity2.currentState.hidden) {
        // If a window is not visible it cannot be adjacent to anything. This also allows us
        // to avoid the questionable position tracking for hidden entities.
        return false;
    } else if (distance.border(ADJACENCY_FUZZ_DISTANCE) && Math.abs(distance.maxAbs) > MIN_OVERLAP) {
        // The overlap check ensures that only valid snap configurations are counted.
        // We make it a small number to account for sub-pixel distances on > 100% scale monitors
        return true;
    }
    return false;
}

function areOverlapping<T>(entity1: DesktopEntity<T>, entitiy2: DesktopEntity<T>): boolean {
    const distance = RectUtils.distance(entity1.currentState, entitiy2.currentState);

    if (distance.within(-ADJACENCY_FUZZ_DISTANCE)) {
        return true;
    }

    return false;
}
