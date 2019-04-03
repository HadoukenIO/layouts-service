import * as assert from 'power-assert';

import {assertAllContiguous, assertGrouped, assertNoOverlap, assertNotGrouped} from '../../provider/utils/assertions';
import {delay} from '../../provider/utils/delay';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {getBounds} from '../../provider/utils/getBounds';
import {teardown} from '../../teardown';
import {CreateWindowData, createWindowTest} from '../utils/createWindowTest';

afterEach(teardown);

describe('When a window is dragged adjacent to an existing snapgroup, it snaps as expected without overlap', () => {
    it('Shape: U', async () => await createWindowTest(async (context, testOptions: CreateWindowData) => {
                       const {windows} = context;

                       // Sizes for the windows to make it work
                       await Promise.all([
                           windows[0].resizeTo(230, 210, 'top-left'),
                           windows[1].resizeTo(210, 170, 'top-left'),
                           windows[2].resizeTo(260, 170, 'top-left'),
                           windows[3].resizeTo(200, 270, 'top-left'),
                           windows[4].resizeTo(220, 170, 'top-left')
                       ]);

                       await delay(500);

                       // Arrange the windows into a horseshoe shape
                       await windows[0].moveTo(700, 300);
                       await delay(500);
                       await dragSideToSide(windows[1], 'top', windows[0], 'bottom', {x: 110, y: 5});
                       await dragSideToSide(windows[2], 'right', windows[1], 'left', {x: -5, y: 50});
                       await dragSideToSide(windows[3], 'right', windows[2], 'left', {x: 0, y: -210});

                       await assertGrouped(...windows.slice(0, -1));
                       await assertAllContiguous(windows.slice(0, -1));
                       await assertNotGrouped(windows[4]);

                       // This is a safety check in case snapping behavior changes and the magic numbers above
                       // no longer do what they're supposed to. Window should be offset or this test will pass but not
                       // actually test for the defect.
                       assert.notStrictEqual(
                           (await getBounds(windows[1])).left,
                           (await getBounds(windows[0])).left,
                           'Window 1 resized when snapped - should be offset - snap/anchor distance may have changed');

                       // Drag remaining window into the middle of the horseshoe and check it snaps with no overlap
                       await dragSideToSide(windows[4], 'bottom', windows[2], 'top', {x: 10, y: -5});
                       await delay(500);

                       await assertGrouped(...windows);
                       await assertAllContiguous(windows);
                       await assertNoOverlap(windows);
                   })({windowCount: 5, frame: true}));

    it('Shape: O', async () => await createWindowTest(async (context, testOptions: CreateWindowData) => {
                       const {windows} = context;

                       // Sizes for the windows to make it work
                       await Promise.all([
                           windows[0].resizeTo(200, 300, 'top-left'),
                           windows[1].resizeTo(300, 170, 'top-left'),
                           windows[2].resizeTo(200, 300, 'top-left'),
                           windows[3].resizeTo(300, 170, 'top-left'),
                           windows[4].resizeTo(220, 220, 'top-left')
                       ]);

                       await delay(500);

                       // Arrange the windows into a hollow circle shape
                       await windows[0].moveTo(800, 300);
                       await delay(500);
                       await dragSideToSide(windows[1], 'top', windows[0], 'bottom', {x: -230, y: 5});
                       await dragSideToSide(windows[2], 'right', windows[1], 'left', {x: -5, y: -230});
                       await dragSideToSide(windows[3], 'bottom', windows[2], 'top', {x: 120, y: -5});

                       await assertGrouped(...windows.slice(0, -1));
                       await assertAllContiguous(windows.slice(0, -1));
                       await assertNotGrouped(windows[4]);

                       // Drag remaining window into the middle of the horseshoe and check it snaps with no overlap
                       await dragSideToSide(windows[4], 'bottom', windows[1], 'top', {x: 15, y: -10});
                       await delay(500);

                       await assertGrouped(...windows);
                       await assertAllContiguous(windows);
                       await assertNoOverlap(windows);
                   })({windowCount: 5, frame: true}));
});