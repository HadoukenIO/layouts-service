import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import * as SideUtils from '../../provider/utils/SideUtils';
import {Side} from '../../provider/utils/SideUtils';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {refreshWindowState} from '../utils/modelUtils';
import {testParameterized} from '../utils/parameterizedTestUtils';

// Width and Height of the windows when spawned
const WINDOW_SIZE = 250;
// Amount by which windows will grow/shrink before snapping.
const RESIZE_AMOUNT = 50;

interface ResizeOnSnapOptions extends CreateWindowData {
    side: Side;
    resizeDirection: 'small-to-big'|'big-to-small';
    windowCount: 2;
}

interface Constraints {
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;
    resizable?: boolean;
    resizeRegion?: ResizeRegion;
}

interface ResizeRegion {
    sides: {[K in ResizeSides]: boolean;};
}
type ResizeSides = 'top'|'bottom'|'left'|'right';

interface ResizeWithConstrainsOptions extends ResizeOnSnapOptions {
    constraints: Constraints;
    shouldResize: boolean;
}

// With window constraints
testParameterized(
    (testOptions: ResizeWithConstrainsOptions):
        string => {
            const frameString = testOptions.frame ? 'framed' : 'frameless';
            const resizeDirectionString = testOptions.resizeDirection.split('-').join(' ');
            let constraintsString;
            if (Object.keys(testOptions.constraints).length === 0) {
                constraintsString = 'No Constraints';
            } else if (!!testOptions.constraints.resizeRegion) {
                const sides = testOptions.constraints.resizeRegion.sides;
                constraintsString = `Resize regions: ${(Object.keys(sides) as ResizeSides[]).filter((side) => sides[side]).join(', ')}`;
            } else {
                constraintsString = `Constraints: ${JSON.stringify(testOptions.constraints).slice(1, -1)}`;
            }

            return `Resize on Snap - ${frameString} - ${testOptions.side} - ${resizeDirectionString} - ${constraintsString}`;
        },
    [
        // No constraints. Normal resizing behaviour expected
        {frame: true, windowCount: 2, resizeDirection: 'big-to-small', side: 'right', constraints: {}, shouldResize: true},
        {frame: true, windowCount: 2, resizeDirection: 'big-to-small', side: 'bottom', constraints: {}, shouldResize: true},
        {frame: true, windowCount: 2, resizeDirection: 'small-to-big', side: 'right', constraints: {}, shouldResize: true},
        {frame: true, windowCount: 2, resizeDirection: 'small-to-big', side: 'bottom', constraints: {}, shouldResize: true},
        // Resizable false. No resize should occur.
        {frame: true, windowCount: 2, resizeDirection: 'big-to-small', side: 'right', constraints: {resizable: false}, shouldResize: false},
        {frame: true, windowCount: 2, resizeDirection: 'small-to-big', side: 'bottom', constraints: {resizable: false}, shouldResize: false},
        // Constraint in axis of resize.
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'small-to-big',
            side: 'right',
            constraints: {resizeRegion: {sides: {top: false, bottom: false, left: true, right: true}}},
            shouldResize: false
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'small-to-big',
            side: 'bottom',
            constraints: {resizeRegion: {sides: {left: false, right: false, top: true, bottom: true}}},
            shouldResize: false
        },
        // Constraint not in axis of resize
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'right',
            constraints: {resizeRegion: {sides: {left: false, right: false, top: true, bottom: true}}},
            shouldResize: true
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'bottom',
            constraints: {resizeRegion: {sides: {top: false, bottom: false, left: true, right: true}}},
            shouldResize: true
        },
        // Resize region only on perpendicular sides. Same as no constraint.
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'right',
            constraints: {resizeRegion: {sides: {left: false, top: false, right: true, bottom: true}}},
            shouldResize: true
        },
        // Size constraints
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'right',
            constraints: {minHeight: WINDOW_SIZE + RESIZE_AMOUNT / 2},
            shouldResize: false
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'bottom',
            constraints: {minWidth: WINDOW_SIZE + RESIZE_AMOUNT / 2},
            shouldResize: false
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'small-to-big',
            side: 'right',
            constraints: {maxHeight: WINDOW_SIZE - RESIZE_AMOUNT / 2},
            shouldResize: false
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'small-to-big',
            side: 'bottom',
            constraints: {maxWidth: WINDOW_SIZE - RESIZE_AMOUNT / 2},
            shouldResize: false
        },
        // Irrelevant size constraint
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'bottom',
            constraints: {minWidth: WINDOW_SIZE - RESIZE_AMOUNT / 2},
            shouldResize: true
        },
    ],
    createWindowTest(async (t, testOptions: ResizeWithConstrainsOptions) => {
        const {resizeDirection, side, shouldResize, constraints} = testOptions;
        const windows = t.context.windows;

        // Resize the second window based on the test params
        if (resizeDirection === 'big-to-small') {
            await windows[1].resizeBy(RESIZE_AMOUNT, RESIZE_AMOUNT, 'top-left');
        } else {
            await windows[1].resizeBy(-RESIZE_AMOUNT, -RESIZE_AMOUNT, 'top-left');
        }

        // Apply constraints
        await windows[1].updateOptions(constraints);
        await refreshWindowState(windows[1].identity);

        await delay(500);

        const boundsBefore = await getBounds(windows[1]);

        // Snap the windows together
        await dragSideToSide(windows[1], SideUtils.opposite(side), windows[0], side);

        // Assert snapped and docked
        await assertAdjacent(t, windows[0], windows[1], side);
        await assertGrouped(t, windows[0], windows[1]);


        const bounds = [await getBounds(windows[0]), await getBounds(windows[1])];

        t.true(
            (boundsBefore.height !== bounds[1].height || boundsBefore.width !== bounds[1].width) === shouldResize,
            `Window${shouldResize ? ' not' : ''} resized when it should${shouldResize ? '' : 'n\'t'}`);

        // Check that the windows are (not) aligned (depending on constraints)
        if (side === 'top' || side === 'bottom') {
            t.true(
                (bounds[0].left === bounds[1].left && bounds[0].right === bounds[1].right) === shouldResize,
                `Windows${shouldResize ? ' not' : ''} aligned when they should${shouldResize ? '' : 'n\'t'} be`);
        } else {
            t.true(
                (bounds[0].top === bounds[1].top && bounds[0].bottom === bounds[1].bottom) === shouldResize,
                `Windows${shouldResize ? ' not' : ''} aligned when they should${shouldResize ? '' : 'n\'t'} be`);
        }
    }, {defaultHeight: WINDOW_SIZE, defaultWidth: WINDOW_SIZE}));