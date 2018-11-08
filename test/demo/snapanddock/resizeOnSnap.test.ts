import {assertAdjacent, assertGrouped} from '../../provider/utils/assertions';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import * as SideUtils from '../../provider/utils/SideUtils';
import {Side} from '../../provider/utils/SideUtils';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {testParameterized} from '../utils/parameterizedTestUtils';
import { delay } from '../../provider/utils/delay';

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
    resizeRegion?: {sides: {top?: boolean; bottom?: boolean; left?: boolean; right?: boolean;}};
}

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
                constraintsString = `Resize regions: ${Object.keys(testOptions.constraints.resizeRegion.sides).join(', ')}`;
            } else {
                constraintsString = `Constraints: ${JSON.stringify(testOptions.constraints).slice(1, -1)}`;
            }

            return `Resize on Snap - ${frameString} - ${resizeDirectionString} - ${constraintsString}`;
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
            constraints: {resizeRegion: {sides: {top: false, bottom: false}}},
            shouldResize: false
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'small-to-big',
            side: 'bottom',
            constraints: {resizeRegion: {sides: {left: false, right: false}}},
            shouldResize: false
        },
        // Constraint not in axis of resize
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'right',
            constraints: {resizeRegion: {sides: {left: false, right: false}}},
            shouldResize: true
        },
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'bottom',
            constraints: {resizeRegion: {sides: {top: false, bottom: false}}},
            shouldResize: true
        },
        // Resize region only on perpendicular sides. Same as no constraint.
        {
            frame: true,
            windowCount: 2,
            resizeDirection: 'big-to-small',
            side: 'right',
            constraints: {resizeRegion: {sides: {left: false, top: false}}},
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

        await delay(500);

        // Snap the windows together
        await dragSideToSide(windows[1], SideUtils.opposite(side), windows[0], side);

        // Assert snapped and docked
        await assertAdjacent(t, windows[0], windows[1], side);
        await assertGrouped(t, windows[0], windows[1]);


        // Check that the windows are (not) now the same width/height (depending on constraints)
        const bounds = [await getBounds(windows[0]), await getBounds(windows[1])];
        let windowResized: boolean;
        if (side === 'top' || side === 'bottom') {
            windowResized = bounds[0].left === bounds[1].left && bounds[0].right === bounds[1].right;
        } else {
            windowResized = bounds[0].top === bounds[1].top && bounds[0].bottom === bounds[1].bottom;
        }

        if (windowResized === shouldResize) {
            t.pass();
        } else {
            t.fail(`Window was expected${shouldResize ? ' ' : ' not '}to resize, but did ${windowResized ? '' : 'not'}`);
        }
    }, {defaultHeight: WINDOW_SIZE, defaultWidth: WINDOW_SIZE}));