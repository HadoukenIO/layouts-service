// import {AnyContext, GenericTestContext, test} from 'ava';
import {Fin, Window} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../src/client/main';
import {explodeGroup} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {delay} from './utils/delay';
import {getBounds} from './utils/getBounds';
import {isInGroup} from './utils/isInGroup';
import {isOverlappedWith} from './utils/isOverlappedWith';
import {defaultArrangements, WindowInitializer} from './utils/WindowInitializer';

/*const windows: Window[] = new Array<Window>();
let fin: Fin;
let windowInitializer: WindowInitializer;*/

/*jest.setTimeout(60 * 1000);
interface JestInterface {
    retryTimes: Function;
}
(jest as unknown as JestInterface).retryTimes(5);

beforeAll(async () => {
    console.log('*** geting connection');
    fin = await getConnection();
    console.log('*** got connection');

    windowInitializer = new WindowInitializer();
});

afterEach(async () => {
    // Try and close all the windows.  If the window is already closed then it will throw an error which we catch and ignore.
    for (const win of windows) {
        await win.close().catch(e => {
            console.warn(`error closing window ${win.identity.name} ${e.message}`);
        });
    }

    windows = [];
    await delay(500);
    await teardown();
});*/


/*async function assertExploded() {
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
}*/

/*
 * A basic explode test will be run for each window arrangement in the
 * arrangemtns object. To add an additional window layouts to be tested, simply
 * add new entries there.
 */

const testNumber = 0;

/*Object.keys(defaultArrangements).forEach(num => {
    const count = Number.parseInt(num, 10);

    Object.keys(defaultArrangements[count]).forEach(name => {
        test(`${count} windows - ${name}`, async () => {
            console.log(`*** Running ${count} windows - ${name}`);

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
});*/