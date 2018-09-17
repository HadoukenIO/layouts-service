import {TestContext} from 'ava';
import {Window} from 'hadouken-js-adapter';
import {NormalizedBounds} from './getBounds';

export async function assertGrouped(win1: Window, win2: Window, t: TestContext) {
    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

    // Both windows are in the same SnapGroup
    // TODO (Pending test framework improvements to allow pulling data from the service)
}

export async function assertNotGrouped(win: Window, t: TestContext) {
    // Window is not native grouped
    const group = await win.getGroup();
    t.is(group.length, 0);

    // Window is alone in it's SnapGroup
    // TODO (Pending test framework improvements to allow pulling data from the service)
}

export function assertMoved(bounds1: NormalizedBounds, bounds2: NormalizedBounds, t: TestContext) {
    t.notDeepEqual(bounds1, bounds2);
}

export function assertNotMoved(bounds1: NormalizedBounds, bounds2: NormalizedBounds, t: TestContext) {
    t.deepEqual(bounds1, bounds2);
}