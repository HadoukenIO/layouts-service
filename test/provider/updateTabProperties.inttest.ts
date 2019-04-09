import {Fin} from 'hadouken-js-adapter';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import * as assert from 'power-assert';

import {WindowIdentity} from '../../src/provider/model/DesktopWindow';
import {executeJavascriptOnService} from '../demo/utils/serviceUtils';
import {updateTabProperties} from '../demo/utils/tabServiceUtils';
import {teardown} from '../teardown';

import {getConnection} from './utils/connect';
import {tabWindowsTogether} from './utils/tabWindowsTogether';
import {WindowInitializer} from './utils/WindowInitializer';

let fin: Fin;

let wins: _Window[] = [];

const windowInitializer = new WindowInitializer();

beforeAll(async () => {
    fin = await getConnection();
});
beforeEach(async () => {
    wins = await windowInitializer.initWindows(2);
});

afterEach(async () => {
    // Try and close all the windows.  If the window is already closed then it will throw an error which we catch and ignore.
    await Promise.all(wins.map(win => {
        return win.close().catch(() => {});
    }));

    wins = [];
});
afterEach(teardown);

it('When calling updateTabProperties, property changes reflected in service', async () => {
    // Drag wins[0] over wins[1] to make a tabset (in valid drop region)
    await tabWindowsTogether(wins[0], wins[1]);

    const newProps = {title: '' + Math.random() * 10, icon: 'http://cdn.openfin.co/favicon.ico'};

    // Update first windows Tab Properties (icon, title);
    await updateTabProperties(wins[0].identity, newProps);

    function remoteFunc(this: ProviderWindow, identity: WindowIdentity) {
        const tabWindow = this.model.getWindow(identity as WindowIdentity);

        // @ts-ignore Accessing private variables in the name of testing.
        return tabService.getTabProperties(tabWindow);
    }

    // Execute remote to fetch our windows tab properties from service.
    const result = await executeJavascriptOnService(remoteFunc, wins[0].identity as WindowIdentity);

    // Assert that the properties we get back are equal to the ones we updated with.
    assert.deepEqual(result, newProps);
});

/**
 * Cannot access document in Runtime 37+
 *
 * TODO: See if there is an alternate way of testing this.
 */
it.skip('When calling updateTabProperties, property changes reflected in tabstrip DOM', async () => {
    // Drag wins[0] over wins[1] to make a tabset (in valid drop region)
    await tabWindowsTogether(wins[0], wins[1]);

    const newProps = {title: '' + Math.random() * 10, icon: 'http://cdn.openfin.co/favicon.ico'};

    // Update first windows Tab Properties (icon, title);
    await updateTabProperties(wins[0].identity, newProps);

    function remoteFunc(this: ProviderWindow, identity: WindowIdentity) {
        const tabGroup = this.model.getWindow(identity as WindowIdentity)!.tabGroup;

        if (tabGroup) {
            // @ts-ignore Accessing private variables in the name of testing.
            const tabDOM: Document = tabGroup._window.window.nativeWindow.document;

            return Array.from(tabDOM.getElementsByClassName('tab-content-wrap')).map((el) => {
                return {
                    title: el.getElementsByClassName('tab-content')[0].textContent,
                    icon: (el.getElementsByClassName('tab-favicon')[0] as HTMLElement).style.backgroundImage
                };
            });
        }

        return [];
    }

    // Execute remote to fetch all tab titles, icons from DOM
    const result = await executeJavascriptOnService(remoteFunc, wins[0].identity as WindowIdentity);

    // Assert that at least one of the tabs match the properties we updated with.
    assert.strictEqual(result.some(el => el.title === newProps.title && el.icon!.includes(newProps.icon)), true);
});
