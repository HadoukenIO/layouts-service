import {Fin, Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {WindowIdentity} from '../../src/client/main';
import {explodeGroup} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {getBounds} from './utils/getBounds';
import {isInGroup} from './utils/isInGroup';
import {isOverlappedWith} from './utils/isOverlappedWith';
import {defaultArrangements, WindowInitializer} from './utils/WindowInitializer';

let windows: Window[] = new Array<Window>();
let fin: Fin;
let windowInitializer: WindowInitializer;

beforeAll(async () => {
    fin = await getConnection();
    windowInitializer = new WindowInitializer();
});
afterEach(async () => {
    // Closes all windows and resets the array for the next test.
    for (const win of windows) {
        if (win) {
            await win.close();
        }
    }
    windows = new Array<Window>();
});
afterEach(teardown);

async function assertExploded() {
    // Check each window
    for (let i = 0; i < windows.length; i++) {
        // Windows are no longer grouped
        if (await isInGroup(windows[i])) {
            assert.fail(`Window ${i} still in group after explode`);
        }

        // Windows are not overlapped
        for (let j = i + 1; j < windows.length; j++) {
            if (await isOverlappedWith(windows[i], windows[j])) {
                assert.fail(`Window ${i} overlapped with window ${j} after explode`);
            }
        }
    }
}

/*
 * A basic explode test will be run for each window arrangement in the
 * arrangements object. To add an additional window layouts to be tested,
 * simply add new entries there.
 */
describe('When calling explodeGroup, windows are ungrouped and moved as expected', () => {
    Object.keys(defaultArrangements).forEach(num => {
        const count = Number.parseInt(num, 10);

        Object.keys(defaultArrangements[count]).forEach(name => {
            it(`${count} windows - ${name}`, async () => {
                // This will spawn the required number of windows in the correct
                // positions/groups
                windows = await windowInitializer.initWindows(count, name);

                // Special handling for single window. Checks window did not move in any way
                if (count === 1) {
                    const boundsBefore = await getBounds(windows[0]);
                    await explodeGroup(windows[0].identity as WindowIdentity);
                    const boundsAfter = await getBounds(windows[0]);
                    assert.deepEqual(boundsBefore, boundsAfter, 'Single window moved during explode');
                } else {
                    await explodeGroup(windows[0].identity as WindowIdentity);
                }

                // Runs multiple tests to ensure that the group has successfully exploded.
                await assertExploded();
            });
        });
    });
});