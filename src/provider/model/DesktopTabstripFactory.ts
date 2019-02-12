import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ConfigurationObject, Scope, Tabstrip} from '../../../gen/provider/config/layouts-config';
import {ApplicationUIConfig} from '../../client/types';
import {ScopedConfig} from '../config/Store';
import {MaskWatch} from '../config/Watch';
import {config} from '../main';

const DEFAULT_UI_URL = (() => {
    let providerLocation = window.location.href;

    if (providerLocation.indexOf('http://localhost') === 0) {
        // Work-around for fake provider used within test runner
        providerLocation = providerLocation.replace('/test', '/provider');
    }

    // Locate the default tabstrip HTML page, relative to the location of the provider
    return providerLocation.replace('provider.html', 'tabbing/tabstrip/tabstrip.html');
})();

/**
 * Handles creation and pooling of Tab Group Windows
 */
export class DesktopTabstripFactory {
    public static readonly DEFAULT_CONFIG: Tabstrip = {url: DEFAULT_UI_URL, height: 60};

    /**
     * Utility method for converting a Tabstrip|'default' to a Tabstrip
     */
    public static convertToTabstripConfig(config: Tabstrip|'default'): Tabstrip {
        return config === 'default' ? DesktopTabstripFactory.DEFAULT_CONFIG : config;
    }

    /**
     * The window pool
     */
    private _windowPool: Map<string, _Window[]> = new Map();

    private _watch: MaskWatch<ConfigurationObject, {tabstrip: boolean}>;

    constructor() {
        this._watch = new MaskWatch(config, {tabstrip: true});
        this._watch.onAdd.add(this.onTabstripConfigAdded, this);

        // Creates 3 default windows in the pool.
        this.createAndPool(DesktopTabstripFactory.DEFAULT_CONFIG);
        this.createAndPool(DesktopTabstripFactory.DEFAULT_CONFIG);
        this.createAndPool(DesktopTabstripFactory.DEFAULT_CONFIG);
    }

    /**
     * Gets the next window from the window pool.  Will return null if no window is present.
     * @param {ApplicationUIConfig} options The options for the window to retrieve.  Used as key in the window pool map.
     * @returns {_Window | undefined}
     */
    public getNextWindow(options: ApplicationUIConfig): _Window|undefined {
        const pooledWindows = this._windowPool.get(options.url) || [];
        const next = pooledWindows.shift();
        // setTimeout to offset blocking fin window creation
        // Runtime Ticket RUN-4704
        setTimeout(() => {
            this.createAndPool(options);
        }, 2000);
        return next;
    }

    /**
     * Generates a set of window options that will create a tabstrip that meets the given requirements.
     *
     * @param options Tabstrip configuration - either from a user application, or the default (service-defined) configuration.
     */
    public generateTabStripOptions(options: ApplicationUIConfig): fin.WindowOptions {
        return {
            name: `TABSET-${fin.desktop.getUuid()}`,
            url: options.url,
            autoShow: false,
            defaultHeight: options.height,
            minHeight: options.height,
            maxHeight: options.height,
            frame: false,
            maximizable: false,
            resizable: true,
            resizeRegion: {sides: {left: true, top: false, right: true, bottom: false}},
            saveWindowState: false,
            taskbarIconGroup: name,
            backgroundThrottling: true,
            waitForPageLoad: false,
            showTaskbarIcon: false
        };
    }

    /**
     * Handles when an application configuration has been added.
     *
     * @param rule The rule that was added to the store.
     * @param source Identifies the entity that added this rule to the store.
     */
    private onTabstripConfigAdded(rule: ScopedConfig<ConfigurationObject>, source: Scope): void {
        const tabstrip: Tabstrip = rule.config.tabstrip!;
        this.createAndPool(tabstrip);
    }

    /**
     * Creates and pools windows against a specific ApplicationUI configuration.
     * @param {ApplicationUIConfig} options The configuration to create the windows against.
     */
    private createAndPool(options: ApplicationUIConfig) {
        if (!this._windowPool.has(options.url)) {
            this.createWindow(options).then((window) => {
                this._windowPool.set(options.url, [window]);
            });
        } else if (this._windowPool.has(options.url) && this._windowPool.get(options.url)!.length < 3) {
            this.createWindow(options).then((window) => {
                this._windowPool.set(options.url, [...this._windowPool.get(options.url)!, window]);
            });
        }
    }

    /**
     * Creates a single non-pooled window.
     * @param {ApplicationUIConfig} options The configuration to create the windows against.
     */
    private createWindow(options: ApplicationUIConfig) {
        return fin.Window.create(this.generateTabStripOptions(options));
    }
}