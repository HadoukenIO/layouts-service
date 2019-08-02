import {Rectangle} from '../../src/provider/snapanddock/utils/RectUtils';
import {getContiguousEntities} from '../../src/provider/utils/groups';

type TestParam = [
    string,
    Rectangle[],
    number[][]
];

const testParams: TestParam[] = [
    [
        'Adjacent, non-overlapping entities form a single group',
        /**
         * 1
         * 0  2
         */
        [{
            center: {x: 0, y: 0},
            halfSize: {x: 100, y: 100}
        },
        {
            center: {x: 50, y: 150},
            halfSize: {x: 100, y: 50}
        },
        {
            center: {x: 200, y: 0},
            halfSize: {x: 100, y: 100}
        }],
        [[0, 1, 2]]
    ],
    [
        /**
         * 0  3  2
         *
         * 1
         * 4
         */
        'Two sets of adjacent entities form two groups',
        [{
            center: {x: 50, y: 50},
            halfSize: {x: 100, y: 50}
        },
        {
            center: {x: -50, y: 300},
            halfSize: {x: 100, y: 50}
        },
        {
            center: {x: 200, y: 50},
            halfSize: {x: 50, y: 100}
        },
        {
            center: {x: 450, y: 75},
            halfSize: {x: 200, y: 25}
        },
        {
            center: {x: 25, y: 450},
            halfSize: {x: 50, y: 100}
        }],
        [[0, 3, 2], [1, 4]]
    ],
    [
        /**
         *  2
         * 1 0
         */
        'Mutually adjacent, but overlapping entities form three distinct groups',
        [{
            center: {x: 300, y: 200},
            halfSize: {x: 200, y: 100}
        },
        {
            center: {x: 100, y: 200},
            halfSize: {x: 50, y: 100}
        },
        {
            center: {x: 200, y: 0},
            halfSize: {x: 150, y: 100}
        }],
        [[0], [1], [2]]
    ],
    [
        /**
         *      4
         *  0  2 3  1
         */
        'Only overlapping entities are excluded from group',
        [{
            center: {x: -200, y: 100},
            halfSize: {x: 50, y: 100}
        },
        {
            center: {x: 125, y: 100},
            halfSize: {x: 50, y: 100}
        },
        {
            center: {x: -50, y: 100},
            halfSize: {x: 100, y: 100}
        },
        {
            center: {x: 50, y: 100},
            halfSize: {x: 25, y: 100}
        },
        {
            center: {x: 100, y: -50},
            halfSize: {x: 400, y: 50}
        }],
        [[0, 1, 4], [2], [3]]
    ]
];

it.each(testParams)('%s', async (titleParam: string, rectangles: Rectangle[], groups: number[][]) => {
    const entities = rectangles.map(rectangle => ({currentState: {...rectangle, hidden: false}}));

    const expectedResult = groups;
    const actualResult = getContiguousEntities(entities);

    expect(normalize(toIndicies(actualResult, entities))).toEqual(normalize(expectedResult));
});

function toIndicies<T>(groups: T[][], entities: T[]): number[][] {
    return groups.map(group => group.map(entity => entities.indexOf(entity)));
}

function normalize(indexGroups: number[][]): number[][] {
    let resultIndexGroups = indexGroups.slice();

    resultIndexGroups = resultIndexGroups.map(indexGroup => indexGroup.slice().sort());
    resultIndexGroups.sort((indexGroup1, indexGroup2) => {
        if (indexGroup1.length === 0 && indexGroup2.length === 0){
            return 0;
        } else if (indexGroup1.length === 0) {
            return -1;
        } else if (indexGroup2.length === 0) {
            return 1;
        } else {
            // We assume the same index isn't going to appear twice in two different groups - if this happens, something is very wrong and we'll fail anyway
            return indexGroup1[0] - indexGroup2[0];
        }
    });

    return resultIndexGroups;
}
