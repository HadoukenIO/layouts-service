import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {ScopedConfig} from 'openfin-service-config';
import {MaskWatch} from 'openfin-service-config/Watch';

import {ConfigurationObject, Scope, Tabstrip} from '../../../gen/provider/config/layouts-config';
import {ApplicationUIConfig} from '../../client/tabbing';
import {config} from '../main';
import {DEFAULT_TABSTRIP_HEIGHT} from '../utils/constants';

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
    public static readonly DEFAULT_CONFIG: Tabstrip = {url: DEFAULT_UI_URL, height: DEFAULT_TABSTRIP_HEIGHT};
    private static readonly POOL_MAX_SIZE: number = 3;
    private static readonly POOL_MIN_SIZE: number = 1;

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

        // Fills the pool with the default tabstrip windows.
        for (let i = 0; i < DesktopTabstripFactory.POOL_MAX_SIZE; i++) {
            this.createAndPool(DesktopTabstripFactory.DEFAULT_CONFIG);
        }
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
        // TODO: Runtime Ticket RUN-4704
        if (pooledWindows.length < DesktopTabstripFactory.POOL_MIN_SIZE) {
            setTimeout(() => {
                this.createAndPool(options);
            }, 1000);
        }
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
     * @param options The configuration to create the windows against.
     */
    private createAndPool(options: ApplicationUIConfig): void {
        if (!this._windowPool.has(options.url)) {
            this._windowPool.set(options.url, []);
        }
        if (this._windowPool.get(options.url)!.length < DesktopTabstripFactory.POOL_MAX_SIZE) {
            this.createWindow(options).then((window) => {
                this.hideOffScreen(window);
                this._windowPool.get(options.url)!.push(window);
                window.addListener('closed', () =>{
                    this.createAndPool(options);
                });
            });
        }
    }

    /**
     * Hide a window offscreen so it doesn't flicker on startup.
     * @param window The window to hide.
     */
    private async hideOffScreen(window: _Window) {
        const {virtualScreen} = await fin.System.getMonitorInfo();
        const {width, height} = await window.getBounds();
        await window.showAt(virtualScreen.left - width, virtualScreen.top - height);
        await window.hide();
    }

    /**
     * Creates a single non-pooled window.
     * @param {ApplicationUIConfig} options The configuration to create the windows against.
     */
    private async createWindow(options: ApplicationUIConfig): Promise<_Window> {
        const tabStrip = await fin.Window.create(this.generateTabStripOptions(options));
        await tabStrip.disableFrame();
        return tabStrip;
    }
}
