import { test } from 'ava';
import { getBounds, NormalizedBounds } from '../../provider/utils/getBounds';
import * as robot from 'robotjs';
import { Window, Fin, Application } from 'hadouken-js-adapter';
import { getConnection } from '../../provider/utils/connect';
import { getWindow } from '../../provider/utils/getWindow';
import { createTabGroupsFromMultipleWindows } from '../../../src/provider/tabbing/TabUtilities';
import { TabBlob } from '../../../src/client/types';
import { TabService } from '../../../src/provider/tabbing/TabService';
import { executeJavascriptOnService } from '../utils/executeJavascriptOnService';

let win1: Window
let win2: Window;
let fin: Fin;

test.before(async () => {
    fin = await getConnection();
});
test.afterEach.always(async () => {
    await win1.close();
    await win2.close();
    fin.InterApplicationBus.removeAllListeners();
});

test("Create tab group from 2 windows", async (assert) => {
    // Arrange
    const app1: Application = await createTabbingWindow('default', 'App0', 100);
    const app2: Application = await createTabbingWindow('default', 'App1', 500);

    await Promise.all([app1.run(), app2.run()]);

    win1 = await app1.getWindow();
    win2 = await app2.getWindow();
    const preWin2Bounds = await win2.getBounds();

    const tabBlobs: TabBlob[] = [{
        groupInfo: {
            url: "",
            active: { uuid: win2.identity.uuid, name: win2.identity.name! },
            dimensions: {
                x: 100,
                y: 100,
                width: preWin2Bounds.width,
                tabGroupHeight: 130,
                appHeight: preWin2Bounds.height
            }
        },
        tabs: [
            { uuid: app1.identity.uuid, name: win1.identity.name! },
            { uuid: app2.identity.uuid, name: win2.identity.name! },
        ]
    }];

    // Get the service window in order to be able to find the tabgroup window
    const serviceApplication: Application = await fin.Application.wrap({ uuid: "Layout-Manager", name: "Layout-Manager" });    


    // Act
    const scriptToExecute: string = `createTabGroupsFromMultipleWindows(${JSON.stringify(tabBlobs)}).then(() => { fin.desktop.InterApplicationBus.send("TEST", "replytest", "script evaluated", () => { console.log('successfully published') }, console.error)})`;
    await executeJavascriptOnService(scriptToExecute);

    // Tab group should have been created
    const serviceChildWindows: Window[] = await serviceApplication.getChildWindows();
    var uuidTestPattern = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');
    const newTabGroupWindow: Window | undefined = serviceChildWindows.find((window: Window) => {
        return window.identity.uuid == "Layout-Manager" && uuidTestPattern.test(window.identity.name!);
    });
    

    // Assert
    const win1Bounds: NormalizedBounds = await getBounds(win1);
    const win2Bounds: NormalizedBounds = await getBounds(win2);
    const tabGroupBounds: NormalizedBounds = await getBounds(newTabGroupWindow!);

    // Window Bounds equality check
    assert.true(win2Bounds.bottom == win1Bounds.bottom, `bottom are win2: ${win2Bounds.bottom} win1: ${win1Bounds.bottom}`);
    assert.true(win2Bounds.height == win1Bounds.height, `height are win2: ${win2Bounds.height} win1: ${win1Bounds.height}`);
    assert.true(win2Bounds.left == win1Bounds.left, `left are win2: ${win2Bounds.left} win1: ${win1Bounds.left}`);
    assert.true(win2Bounds.right == win1Bounds.right, `right are win2: ${win2Bounds.right} win1: ${win1Bounds.right}`);
    assert.true(win2Bounds.top == win1Bounds.top, `top are win2: ${win2Bounds.top} win1: ${win1Bounds.top}`);
    assert.true(win2Bounds.width == win1Bounds.width, `width are win2: ${win2Bounds.width} win1: ${win1Bounds.width}`);

    // TabGroup existence check
    assert.true(tabGroupBounds.bottom == win2Bounds.top, `Window top bound: ${win2Bounds.top} tab group bottom bound: ${tabGroupBounds.bottom}`);
    assert.true(tabGroupBounds.width == win2Bounds.width, `tab group width ${tabGroupBounds.width} window width: ${win2Bounds.width}`);
    assert.true(tabGroupBounds.left == win1Bounds.left, `left are tabgroup: ${win2Bounds.left} win2: ${win1Bounds.left}`);
    assert.true(tabGroupBounds.right == win1Bounds.right, `right are tabgroup: ${tabGroupBounds.right} win2: ${win2Bounds.right}`);
    assert.true(tabGroupBounds.top + tabGroupBounds.height == win2Bounds.top, `tab top - height: ${tabGroupBounds.top + tabGroupBounds.height} tab group bottom bound: ${win2Bounds.top}`);
    
});

/**
 * Creates a window with tabbing initialised
 * @param page The html page to display
 * @param uuid The uuid for the application
 * @param left The left position
 */
async function createTabbingWindow(page: string, uuid: string, left: number): Promise<Application> {
    return fin.Application.create({
        url: `http://localhost:1337/demo/tabbing/App/${page}.html`,
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