import {Application, Fin, Window} from 'hadouken-js-adapter';
import * as assert from 'power-assert';

import {ApplicationUIConfig} from '../../../src/client/tabbing';
import {TabGroup} from '../../../src/client/workspaces';
import {DesktopTabGroup} from '../../../src/provider/model/DesktopTabGroup';
import {getBounds, NormalizedBounds} from '../../provider/utils/getBounds';
import {teardown} from '../../teardown';
import {fin} from '../utils/fin';
import {executeJavascriptOnService} from '../utils/serviceUtils';
import {getId} from '../utils/tabServiceUtils';

let win1: Window;
let win2: Window;

afterEach(async () => {
    await win1.close();
    await win2.close();
    fin.InterApplicationBus.removeAllListeners();

    await teardown();
});

it('When calling createTabGroupsFromWorkspace, tabgroup is created as expected', async () => {
    // Arrange
    const app1: Application = await createTabbingWindow('default', 'tabapp1', 200);
    const app2: Application = await createTabbingWindow('default', 'tabapp2', 500);

    await Promise.all([app1.run(), app2.run()]);

    win1 = await app1.getWindow();
    win2 = await app2.getWindow();
    const preWin2Bounds = await win2.getBounds();

    const tabGroups: TabGroup[] = [{
        groupInfo: {
            config: {url: 'http://localhost:1337/provider/tabbing/tabstrip/tabstrip.html', height: 60},
            active: {uuid: win2.identity.uuid, name: win2.identity.name!},
            dimensions: {x: 100, y: 100, width: preWin2Bounds.width, appHeight: preWin2Bounds.height},
            state: 'normal'
        },
        tabs: [
            {uuid: app1.identity.uuid, name: win1.identity.name!},
            {uuid: app2.identity.uuid, name: win2.identity.name!}
        ]
    }];

    // Get the service window in order to be able to find the tabgroup window
    const serviceApplication: Application = await fin.Application.wrap({uuid: 'layouts-service', name: 'layouts-service'});


    // Act
    function scriptToExecute(this: ProviderWindow, tabGroups: TabGroup[]): Promise<string> {
        return this.tabService.createTabGroupsFromWorkspace(tabGroups).then((addedGroups: DesktopTabGroup[]) => {
            return addedGroups[0].id;
        });
    }
    const tabGroupId: string = await executeJavascriptOnService<TabGroup[], string>(scriptToExecute, tabGroups);
    assert.ok(tabGroupId);

    // Tab group should have been created
    const serviceChildWindows: Window[] = await serviceApplication.getChildWindows();
    const newTabGroupWindow: Window|undefined = serviceChildWindows.find((window: Window) => {
        return getId(window.identity) === tabGroupId;
    });
    assert.ok(newTabGroupWindow);

    // Assert
    const win1Bounds: NormalizedBounds = await getBounds(win1);
    const win2Bounds: NormalizedBounds = await getBounds(win2);
    const tabGroupBounds: NormalizedBounds = await getBounds(newTabGroupWindow!);

    // Window Bounds equality check
    assert.strictEqual(win2Bounds.bottom, win1Bounds.bottom);
    assert.strictEqual(win2Bounds.height, win1Bounds.height);
    assert.strictEqual(win2Bounds.left, win1Bounds.left);
    assert.strictEqual(win2Bounds.right, win1Bounds.right);
    assert.strictEqual(win2Bounds.top, win1Bounds.top);
    assert.strictEqual(win2Bounds.width, win1Bounds.width);
    assert.strictEqual(win2Bounds.top, (tabGroups[0].groupInfo.dimensions.y + (tabGroups[0].groupInfo.config as ApplicationUIConfig).height));
    assert.strictEqual(win2Bounds.left, tabGroups[0].groupInfo.dimensions.x);


    // TabGroup existence check
    assert.strictEqual(tabGroupBounds.bottom, win2Bounds.top);
    assert.strictEqual(tabGroupBounds.width, win2Bounds.width);
    assert.strictEqual(tabGroupBounds.left, win1Bounds.left);
    assert.strictEqual(tabGroupBounds.right, win1Bounds.right);
    assert.strictEqual(tabGroupBounds.top + tabGroupBounds.height, win2Bounds.top);
});

/**
 * Creates a window with tabbing initialised
 * @param page The html page to display
 * @param uuid The uuid for the application
 * @param left The left position
 */
async function createTabbingWindow(page: string, uuid: string, left: number): Promise<Application> {
    return fin.Application.create({
        url: `http://localhost:1337/demo/tabbing/${page}.html`,
        uuid,
        name: uuid,
        mainWindowOptions: {
            autoShow: true,
            saveWindowState: false,
            defaultTop: 200,
            defaultLeft: left,
            defaultHeight: 200,
            defaultWidth: 200,
            frame: false,
            defaultCentered: true
        }
    });
}
