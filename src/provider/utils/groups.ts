import {Rectangle, RectUtils} from '../snapanddock/utils/RectUtils';
import {MIN_OVERLAP, ADJACENCY_FUZZ_DISTANCE} from '../snapanddock/Constants';

type DesktopEntity<T> = {currentState: Rectangle & {hidden: boolean}} & T;

/**
 * Takes a list of entities and returns the groups these entities form, based on their size and position. Each array of entities
 * returned will form a valid group (no entities overlap, and all entities are transitively adjacent). Broadly tries to minimize
 * the number of arrays returned, and if possible will return a single array containing all input entities.
 */
export function getContiguousEntities<T = {}>(entities: DesktopEntity<T>[]): T[][] {
    const contiguousSets: DesktopEntity<T>[][] = [];
    const disjointEntities: DesktopEntity<T>[] = [];

    // Extract any overlapping entities into trivial groups
    for (const entity of entities) {
        if (entities.some(testEntity => testEntity !== entity && areOverlapping(entity, testEntity))) {
            contiguousSets.push([entity]);
        } else {
            disjointEntities.push(entity);
        }
    }

    // Build adjacency matrix
    const adjacencyMatrix: DesktopEntity<T>[][] = disjointEntities.map((entity1) => {
        return disjointEntities.filter((entity2) => (entity2 !== entity1) && isAdjacent(entity1, entity2));
    });

    // Find all contiguous sets
    while (disjointEntities.length > 0) {
        contiguousSets.push(extractFirstAdjacentSet(disjointEntities, adjacencyMatrix));
    }

    return contiguousSets;
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

function extractFirstAdjacentSet<T>(disjointEntities: DesktopEntity<T>[], adjacencyMatrix: DesktopEntity<T>[][]): DesktopEntity<T>[] {
    const accumulator: DesktopEntity<T>[] = [];

    recursiveDepthFirstSearch(disjointEntities[0]);

    return accumulator;

    function recursiveDepthFirstSearch(entity: DesktopEntity<T>): void {
        const index = disjointEntities.indexOf(entity);

        if (index === -1) {
            return;
        } else {
            const adjacencyList = adjacencyMatrix[index];

            disjointEntities.splice(index, 1);
            adjacencyMatrix.splice(index, 1);

            accumulator.push(entity);

            for (const adjacentEntity of adjacencyList) {
                recursiveDepthFirstSearch(adjacentEntity);
            }
        }
    }
}
