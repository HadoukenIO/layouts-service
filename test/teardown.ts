import {Window} from 'hadouken-js-adapter';
import {WindowInfo, WindowDetail} from 'hadouken-js-adapter/out/types/src/api/system/window';
import {Scopes, StoredConfig} from 'openfin-service-config';
import {ScopePrecedence} from 'openfin-service-config/ConfigUtil';

import {ConfigurationObject} from '../gen/provider/config/layouts-config';

import {executeJavascriptOnService} from './demo/utils/serviceUtils';
import {delay} from './provider/utils/delay';
import {fin} from './demo/utils/fin';

/**
 * Util function to completely reset the desktop in-between test runs.
 *
 * This should be added as a `afterEach` hook in EVERY inttest file.
 *
 * Any left-over state will ultimately cause the previous test to fail, but some additional hardening work is required
 * first. Either way, any invalid state will be cleaned-up so that it does not impact the next test to run.
 */
export async function teardown(): Promise<void> {
    await closeAllWindows();
    await resetProviderState();

    fin.InterApplicationBus.removeAllListeners();

    const msg = await executeJavascriptOnService(function(this: ProviderWindow) {
        const m = this.model;
        const lengths = [m.windows.length, Object.keys(m['_windowLookup']).length, m.snapGroups.length, m.tabGroups.length];

        if (lengths.some(l => l > 0)) {
            return `Clean-up may have failed. Debug info: ${lengths.join(' ')}\n${m.windows.map(w => w.id).join(', ')}\n${m.snapGroups.map(g => `${g.id}
            ${g.entities.map(w => w.id).join(',')}`).join(', ')}\n${m.tabGroups.map(g => `${g.id}${g.tabs.map(w => w.id).join(',')}`).join(', ')}`;
        } else {
            return null;
        }
    });
    if (msg) {
        console.log(msg);
    }
}

async function closeAllWindows(): Promise<void> {
    // Fetch all open windows
    const windowInfo: WindowInfo[] = await fin.System.getAllWindows();
    const windows: Window[] = windowInfo.reduce<Window[]>((windows: Window[], info: WindowInfo) => {
        windows.push(fin.Window.wrapSync({uuid: info.uuid, name: info.mainWindow.name}));
        info.childWindows.forEach((child: WindowDetail) => {
            windows.push(fin.Window.wrapSync({uuid: info.uuid, name: child.name}));
        });

        return windows;
    }, []);

    // Look for any windows that should no longer exist
    const windowIsVisible: boolean[] = await Promise.all(windows.map(w => w.isShowing().catch((e) => {
        console.warn(`isShowing request failed for ${w.identity.uuid}/${w.identity.name}:`, e);
        return false;
    })));
    const invalidWindows: Window[] = windows.filter((window: Window, index: number) => {
        const {uuid, name} = window.identity;

        if (uuid === 'testApp') {
            // Main window persists, but close any child windows
            return name !== uuid;
        } else if (uuid === 'layouts-service') {
            if (name === uuid || name!.startsWith('preview-')) {
                // Main window and preview windows persist
                return false;
            } else if (name!.startsWith('TABSET-')) {
                // Allow pooled tabstrips to persist, but destroy any broken/left-over tabstrips
                // Will assume that any invisible tabstrips are pooled
                return windowIsVisible[index];
            } else {
                // Any other service windows (S&R placeholders, etc) should get cleaned-up
                return false;
            }
        } else {
            // All other applications should get cleaned-up
            return true;
        }
    });

    if (invalidWindows.length > 0) {
        await Promise.all(invalidWindows.map((w: Window) => w.close(true).catch((e) => {
            console.warn(`Window close failed (ignoring) ${w.identity.uuid}/${w.identity.name}:`, e);
        })));

        console.warn(`${invalidWindows.length} window(s) left over after test: ${invalidWindows.map(w => `${w.identity.uuid}/${w.identity.name}`).join(', ')}`);
    }
}

async function resetProviderState(): Promise<void> {
    const msg: string|null = await executeJavascriptOnService<{allScopes: Scopes[]}, string|null>(function(
        this: ProviderWindow,
        params: {allScopes: Scopes[]}
    ): string|null {
        const {allScopes} = params;

        const SEPARATOR_LIST = ', ';
        const SEPARATOR_LINE = '\n    ';

        const {windows, snapGroups, tabGroups} = this.model;
        const msgs: string[] = [];

        // Check model state
        if (windows.length > 0) {
            msgs.push(`Provider still had ${windows.length} windows registered: ${windows.map(w => w.id).join(SEPARATOR_LIST)}`);
            this.model['_windows'].length = 0;
            this.model['_windowLookup'] = {};
        }
        if (snapGroups.length > 0) {
            const groupInfo = snapGroups.map((s, i) => `${i+1}: ${s.id} (${s.entities.map(e => e.id).join(SEPARATOR_LIST)})`).join(SEPARATOR_LINE);

            msgs.push(`Provider still had ${snapGroups.length} snapGroups registered:${SEPARATOR_LINE}${groupInfo}`);
            this.model['_snapGroups'].length = 0;
        }
        if (tabGroups.length > 0) {
            const groupInfo = tabGroups.map((t, i) => `${i + 1}: ${t.id} (${t.tabs.map(w => w.id).join(SEPARATOR_LIST)})`).join(SEPARATOR_LINE);

            msgs.push(`Provider still had ${tabGroups.length} tabGroups registered:${SEPARATOR_LINE}${groupInfo}`);
            this.model['_tabGroups'].length = 0;
        }

        // Check config state
        const rules: Map<Scopes, StoredConfig<ConfigurationObject>[]> = this.config['_items'];
        const watches = this.config['_watches'];
        const loaderApps = this.loader['_appState'];
        const loaderWindows = this.loader['_windowsWithConfig'];
        const expectedRuleCounts: Map<Scopes, number> = new Map<Scopes, number>([
            ['service', 1],
            ['application', 2],
            ['window', 2]
        ]);
        const expectedWatcherCount = 3;
        allScopes.forEach((scope: Scopes) => {
            const rulesWithScope = rules.get(scope) || [];
            const expectedCount = expectedRuleCounts.get(scope) || 0;

            if (rulesWithScope.length !== expectedCount) {
                const configInfo = rulesWithScope.map((rule) => JSON.stringify(rule)).join(SEPARATOR_LINE);
                msgs.push(`Expected ${expectedCount} rules with scope ${scope}, got:${configInfo ? SEPARATOR_LINE + configInfo: ' NONE'}`);

                // Can't do a full clean-up without duplicating provider state here,
                // but removing anything that was defined outside of the service (test windows, etc)
                rules.set(scope, rulesWithScope.filter((config) => config.source.level === 'service'));
            }
        });
        if (watches.length !== expectedWatcherCount) {
            msgs.push(`Had ${watches.length} config watchers registered, expected ${expectedWatcherCount}`);
        }

        const nonTestAppLoaderKeys = Object.keys(loaderApps).filter(uuid => uuid !== 'TEST-jest-env');
        if (nonTestAppLoaderKeys.length > 0) {
            let loaderInfo: string|undefined;

            try {
                loaderInfo = JSON.stringify(loaderApps, null, 4).replace(/\n/g, SEPARATOR_LINE);
            } catch (e) {
                 // eslint-disable-line
            }

            if (loaderInfo) {
                msgs.push(`Expected loader's appState cache to be empty (except for TEST-jest-env), contains:${SEPARATOR_LINE}${loaderInfo}`);
            } else {
                msgs.push(`\
Expected loader's appState cache to be empty (except for TEST-jest-env) and unable to stringify
appState, contains other uuids:${SEPARATOR_LINE}${nonTestAppLoaderKeys.join(', ')}`);
            }
        }
        if (loaderWindows.length !== 1 || loaderWindows[0] !== 'window:testApp/testApp') {
            const loaderInfo = loaderWindows.join(SEPARATOR_LIST);
            msgs.push(`Expected loader's windowsWithConfig cache to only contain testApp, contains:${SEPARATOR_LINE}${loaderInfo}`);
        }

        if (msgs.length > 1) {
            return `${msgs.length} issues detected in provider state:
            ${SEPARATOR_LINE}${msgs.map(msg => msg.replace(/\n/g, SEPARATOR_LINE)).join(SEPARATOR_LINE)}`;
        } else if (msgs.length === 1) {
            return msgs[0];
        } else {
            return null;
        }
    }, {allScopes: Object.keys(ScopePrecedence) as Scopes[]});

    if (msg) {
        // Pass-through debug info from provider
        console.warn(msg);

        // Wait for clean-up to complete
        await delay(1000);
    }
}
