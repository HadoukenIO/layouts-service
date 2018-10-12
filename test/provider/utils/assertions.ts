import {TestContext, GenericTestContext, AnyContext} from 'ava';
import {Window} from 'hadouken-js-adapter';
import {NormalizedBounds, getBounds} from './getBounds';
import { delay } from './delay';

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


/**
 * Asserts that two windows are succesfully tabbed together
 * @param t Ava test context against which to assert
 */
export async function assertTabbed(win1: Window, win2: Window, t: GenericTestContext<AnyContext>): Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    await delay(500);

    // Both windows are in the same native openfin group
    const [group1, group2] = [await win1.getGroup(), await win2.getGroup()];
    for (let i = 0; i < group1.length; i++) {
        t.deepEqual(group1[i].identity, group2[i].identity, 'Window native groups are different');
    }

    // Checks if a tabset window is present in the group (detatched tab check)
    t.truthy(group1.find((win) => {
        return win.identity.name!.includes("TABSET-");
    }),'No tabset window found in openfin group!');

    // Both windows have the same bounds
    const [bounds1, bounds2] = [await getBounds(win1), await getBounds(win2)];
    t.deepEqual(bounds1, bounds2, 'Tabbed windows do not have the same bounds');
}

export async function assertNotTabbed(win: Window, t: GenericTestContext<AnyContext>): Promise<void> {
    // TODO: Determine if the window is tabbed on the service side.

    // Window is native grouped only to the tabstrip
    const nativeGroup = await win.getGroup();

    // Not grouped to any other windows
    t.is(nativeGroup.length, 0);
}
