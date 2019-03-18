// import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

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

jest.setTimeout(60 * 1000);

beforeAll(async () => {
    fin = await getConnection();
    windowInitializer = new WindowInitializer();
});
afterEach(async () => {
    await teardown();
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


async function assertExploded() {
    // Check each window
    for (let i = 0; i < windows.length; i++) {
        // Windows are no longer grouped
        if (await isInGroup(windows[i])) {
            expect(true).toEqual(false);
        } else {
            expect(true).toEqual(true);
        }

        // Windows are not overlapped
        for (let j = i + 1; j < windows.length; j++) {
            if (await isOverlappedWith(windows[i], windows[j])) {
                expect(true).toEqual(false);
            } else {
                expect(true).toEqual(true);
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
        test(`${count} windows - ${name}`, async () => {
            // This will spawn the required number of windows in the correct
            // positions/groups
            windows = await windowInitializer.initWindows(count, name);

            // Special handling for single window. Checks window did not move in any way
            if (count === 1) {
                const boundsBefore = await getBounds(windows[0]);
                await explodeGroup(windows[0].identity as WindowIdentity);
                const boundsAfter = await getBounds(windows[0]);
                expect(boundsBefore).toEqual(boundsAfter);
            } else {
                await explodeGroup(windows[0].identity as WindowIdentity);
            }

            // Runs multiple tests to ensure that the group has succesfully exploded.
            await assertExploded();
        });
    });
});