import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as assert from 'power-assert';

import {assertAdjacent, assertAllContiguous, assertGrouped, assertPairTabbed} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds, getTabsetBounds} from '../../provider/utils/getBounds';
import * as SideUtils from '../../provider/utils/SideUtils';
import {Side} from '../../provider/utils/SideUtils';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';
import {refreshWindowState} from '../utils/modelUtils';
import {itParameterized} from '../utils/parameterizedTestUtils';
import {getActiveTab, getTabstrip} from '../utils/tabServiceUtils';

// Width and Height of the windows when spawned
const WINDOW_SIZE = 250;
// Amount by which windows will grow/shrink before snapping.
const RESIZE_AMOUNT = 50;

interface ResizeOnSnapOptions extends CreateWindowData {
    side: Side;
    resizeDirection: 'small-to-big'|'big-to-small';
    windowCount: 2|4;
}

export interface Constraints {
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;
    resizable?: boolean;
    resizeRegion?: fin.ResizeRegion;
}

interface ResizeWithConstrainsOptions extends ResizeOnSnapOptions {
    constraints: Constraints;
    shouldResize: boolean;
    windowCount: 2;
}

afterEach(teardown);

// With window constraints
itParameterized(
    'When dragging two differently sized windows together, windows are grouped and resized as expected, respecting constraints',
    (testOptions: ResizeWithConstrainsOptions):
        string => {
            const frameString = testOptions.frame ? 'framed' : 'frameless';
            const resizeDirectionString = testOptions.resizeDirection.split('-').join(' ');
            let constraintsString;
            if (Object.keys(testOptions.constraints).length === 0) {
                constraintsString = 'No Constraints';
            } else if (!!testOptions.constraints.resizeRegion) {
                const sides = testOptions.constraints.resizeRegion.sides;
                constraintsString = `Resize regions: ${(Object.keys(sides) as (keyof fin.ResizeRegion['sides'])[]).filter((side) => sides[side]).join(', ')}`;
            } else {
                constraintsString = `Constraints: ${JSON.stringify(testOptions.constraints).slice(1, -1)}`;
            }

            return `${frameString} - ${testOptions.side} - ${resizeDirectionString} - ${constraintsString}`;
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
    createWindowTest(async (context, testOptions: ResizeWithConstrainsOptions) => {
        const {resizeDirection, side, shouldResize, constraints} = testOptions;
        const windows = context.windows;

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
        await assertAdjacent(windows[0], windows[1], side);
        await assertGrouped(windows[0], windows[1]);


        const bounds = [await getBounds(windows[0]), await getBounds(windows[1])];

        assert.strictEqual(
            (boundsBefore.height !== bounds[1].height || boundsBefore.width !== bounds[1].width) === shouldResize,
            true,
            `Window${shouldResize ? ' not' : ''} resized when it should${shouldResize ? '' : 'n\'t'}`);

        // Check that the windows are (not) aligned (depending on constraints)
        if (side === 'top' || side === 'bottom') {
            assert.strictEqual(
                (bounds[0].left === bounds[1].left && bounds[0].right === bounds[1].right) === shouldResize,
                true,
                `Windows${shouldResize ? ' not' : ''} aligned when they should${shouldResize ? '' : 'n\'t'} be`);
        } else {
            assert.strictEqual(
                (bounds[0].top === bounds[1].top && bounds[0].bottom === bounds[1].bottom) === shouldResize,
                true,
                `Windows${shouldResize ? ' not' : ''} aligned when they should${shouldResize ? '' : 'n\'t'} be`);
        }
    }, {defaultHeight: WINDOW_SIZE, defaultWidth: WINDOW_SIZE}));


// With tabsets
itParameterized(
    'When dragging two differently sized, tabbed, windows together, windows are grouped and resized as expected',
    (testOptions: ResizeOnSnapOptions):
        string => {
            const resizeDirectionString = testOptions.resizeDirection.split('-').join(' ');

            return `${testOptions.side} - ${resizeDirectionString}`;
        },
    [
        // No constraints. Normal resizing behaviour expected
        {frame: true, windowCount: 4, resizeDirection: 'big-to-small', side: 'right'},
        {frame: true, windowCount: 4, resizeDirection: 'big-to-small', side: 'bottom'},
        {frame: true, windowCount: 4, resizeDirection: 'small-to-big', side: 'right'},
        {frame: true, windowCount: 4, resizeDirection: 'small-to-big', side: 'bottom'}
    ],
    createWindowTest(async (context, testOptions: ResizeOnSnapOptions) => {
        const {resizeDirection, side} = testOptions;
        const windows = context.windows;

        // Resize the second window based on the test params
        if (resizeDirection === 'big-to-small') {
            await windows[2].resizeBy(RESIZE_AMOUNT, RESIZE_AMOUNT, 'top-left');
        } else {
            await windows[2].resizeBy(-RESIZE_AMOUNT, -RESIZE_AMOUNT, 'top-left');
        }

        await delay(500);

        await tabWindowsTogether(windows[0], windows[1]);
        await tabWindowsTogether(windows[2], windows[3]);

        await delay(500);

        await assertPairTabbed(windows[0], windows[1]);
        await assertPairTabbed(windows[2], windows[3]);

        const tabstrips = [await getTabstrip(windows[0].identity), await getTabstrip(windows[2].identity)];
        const activeTabs = await Promise.all([windows[0], windows[2]].map(async win => fin.Window.wrap(await getActiveTab(win.identity))));

        const boundsBefore = await getTabsetBounds(activeTabs[1]);

        // Snap the windows together
        await dragSideToSide(activeTabs[1], SideUtils.opposite(side), activeTabs[0], side, {x: 10, y: side === 'bottom' ? 70 : 10});

        // Assert snapped and docked
        await assertGrouped(...[...windows, ...tabstrips]);
        await assertAllContiguous([...windows, ...tabstrips]);

        // CHANGES BELOW

        const bounds = [await getTabsetBounds(activeTabs[0]), await getTabsetBounds(activeTabs[1])];

        assert.strictEqual(boundsBefore.height !== bounds[1].height || boundsBefore.width !== bounds[1].width, true, `Window not resized when it should`);

        // Check that the windows are (not) aligned (depending on constraints)
        if (side === 'top' || side === 'bottom') {
            assert.strictEqual((bounds[0].left === bounds[1].left && bounds[0].right === bounds[1].right), true, `Windows not aligned when they should be`);
        } else {
            assert.strictEqual((bounds[0].top === bounds[1].top && bounds[0].bottom === bounds[1].bottom), true, `Windows not aligned when they should be`);
        }
    }, {defaultHeight: WINDOW_SIZE, defaultWidth: WINDOW_SIZE}));
