import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../src/client/types';
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

test.before(async () => {
    fin = await getConnection();
    windowInitializer = new WindowInitializer();
});
test.afterEach.always(async (t) => {
    // Closes all windows and resets the array for the next test.
    for (const win of windows) {
        if (win) {
            await win.close();
        }
    }
    windows = new Array<Window>();
    await teardown(t);
});

async function assertExploded(t: GenericTestContext<AnyContext>) {
    // Check each window
    for (let i = 0; i < windows.length; i++) {
        // Windows are no longer grouped
        if (await isInGroup(windows[i])) {
            t.fail(`Window ${i} still in group after explode`);
        } else {
            t.pass();
        }

        // Windows are not overlapped
        for (let j = i + 1; j < windows.length; j++) {
            if (await isOverlappedWith(windows[i], windows[j])) {
                t.fail(`Window ${i} overlapped with window ${j} after explode`);
            } else {
                t.pass();
            }
        }
    }
}

/*
 * A basic explode test will be run for each window arrangement in the
 * arrangemtns object. To add an additional window layouts to be tested, simply
 * add new entries there.
 */
Object.keys(defaultArrangements).forEach(num => {
    const count = Number.parseInt(num, 10);

    Object.keys(defaultArrangements[count]).forEach(name => {
        test(`${count} windows - ${name}`, async t => {
            // This will spawn the required number of windows in the correct
            // positions/groups
            windows = await windowInitializer.initWindows(count, name);

            // Special handling for single window. Checks window did not move in any way
            if (count === 1) {
                const boundsBefore = await getBounds(windows[0]);
                await explodeGroup(windows[0].identity as WindowIdentity);
                const boundsAfter = await getBounds(windows[0]);
                t.deepEqual(boundsBefore, boundsAfter, 'Single window moved during explode');
            } else {
                await explodeGroup(windows[0].identity as WindowIdentity);
            }

            // Runs multiple tests to ensure that the group has succesfully exploded.
            await assertExploded(t);
        });
    });
});