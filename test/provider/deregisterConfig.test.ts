import {Context, GenericTestContext, test} from 'ava';
import {Window} from 'hadouken-js-adapter';

import {ConfigurationObject, Scope} from '../../gen/provider/config/layouts-config';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {isWindowRegistered} from '../demo/utils/snapServiceUtils';
import {teardown} from '../teardown';

import {assertGrouped, assertTabbed} from './utils/assertions';
import {createChildWindow} from './utils/createChildWindow';
import {delay} from './utils/delay';
import {dragSideToSide, dragWindowTo} from './utils/dragWindowTo';
import {tabWindowsTogether} from './utils/tabWindowsTogether';

type TestContext = GenericTestContext<Context<{windows: Window[]}>>;

const DEFAULT_OPTIONS: fin.WindowOptions = {
    url: 'http://localhost:1337/demo/popup.html',
    autoShow: true,
    saveWindowState: false,
    defaultTop: 100,
    defaultLeft: 100,
    defaultWidth: 300,
    defaultHeight: 200
};

async function addRuleToProvider(scope: Scope, config: ConfigurationObject): Promise<void> {
    return executeJavascriptOnService(function(this: ProviderWindow, data) {
        this.config.add(data.scope, data.config);
    }, {scope, config});
}

test.beforeEach(async (t: TestContext) => {
    t.context.windows = [];
});
test.afterEach.always(async (t: TestContext) => {
    await Promise.all(t.context.windows.map(win => win.close()));

    await teardown(t);
});

test('Window can be de-registered by adding a rule to the store', async (t: TestContext) => {
    const win = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow'});
    t.context.windows.push(win);

    t.true(await isWindowRegistered(win.identity));
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow'}, {enabled: false});
    t.false(await isWindowRegistered(win.identity));
});

test('A de-registered window can be re-registered by adding a rule to the store', async t => {
    const win = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow', url: 'http://localhost:1337/test/popup-deregistered.html'});
    t.context.windows.push(win);

    t.false(await isWindowRegistered(win.identity));
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow'}, {enabled: true});
    t.true(await isWindowRegistered(win.identity));
});

test('When a snapped window is de-registered, it is removed from its snap group', async (t: TestContext) => {
    const windows = t.context.windows;
    windows.push(await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow1'}));
    windows.push(await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow2'}));

    await dragSideToSide(windows[0], 'left', windows[1], 'right');
    await assertGrouped(t, ...windows);
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow1'}, {enabled: false});

    t.false(await isWindowRegistered(windows[0].identity));
    t.true(await isWindowRegistered(windows[1].identity));

    const groups = await Promise.all(windows.map(w => w.getGroup()));
    t.is(groups[0].length, 0);
    t.is(groups[1].length, 0);
});

test('When a tabbed window is de-registered, it is removed from its tab group', async (t: TestContext) => {
    const windows = t.context.windows;
    const w1 = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow1'});
    const w2 = await createChildWindow({...DEFAULT_OPTIONS, name: 'testWindow2'});
    windows.push(w1, w2);

    await tabWindowsTogether(windows[0], windows[1]);

    await delay(1000);

    await assertTabbed(windows[0], windows[1], t);
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow1'}, {enabled: false});

    t.false(await isWindowRegistered(windows[0].identity));
    t.true(await isWindowRegistered(windows[1].identity));

    const groups = await Promise.all(windows.map(w => w.getGroup()));
    t.is(groups[0].length, 0);
    t.is(groups[1].length, 0);
});

test('When a tabbed window is de-registered, it is removed from its snapped tab group', async (t: TestContext) => {
    const windows = t.context.windows;
    for (let i = 0; i < 4; i++) {
        windows.push(
            await createChildWindow({...DEFAULT_OPTIONS, name: `testWindow${i + 1}`, defaultLeft: (i % 2) * 320, defaultTop: Math.floor(i / 2) * 220}));
    }

    // Setup tab/snap groups.
    // Windows are frameless, so can snap by windows rather than by tabstrips
    await tabWindowsTogether(windows[0], windows[1]);
    await tabWindowsTogether(windows[2], windows[3]);
    await dragSideToSide(windows[0], 'left', windows[2], 'right');
    const bounds = await windows[0].getBounds();
    await dragWindowTo(windows[0], bounds.left + 100, bounds.top + 100);

    // Ensure windows are in position
    await assertTabbed(windows[0], windows[1], t);
    await assertTabbed(windows[2], windows[3], t);
    await assertGrouped(t, ...windows);

    // De-register first window
    await addRuleToProvider({level: 'window', uuid: 'testApp', name: 'testWindow1'}, {enabled: false});

    // Allow for config to be applied and window de-registered
    await delay(500);

    // Ensure first window is de-registered
    t.false(await isWindowRegistered(windows[0].identity));
    for (let i = 1; i < 4; i++) {
        t.true(await isWindowRegistered(windows[i].identity));
    }

    // Ensure first window is de-tabbed whilst others remain grouped
    const groups = await Promise.all(windows.map(w => w.getGroup()));
    const groupSizes = groups.map(g => g.length);
    t.deepEqual(groupSizes, [0, 4, 4, 4]);  // 4 Windows in group - 3 tabs and the one remaining tabstrip
});
