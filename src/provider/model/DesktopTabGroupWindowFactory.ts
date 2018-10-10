import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ApplicationUIConfig} from '../../client/types';
import {ApplicationConfigManager} from '../tabbing/components/ApplicationConfigManager';

import {createTabGroupId} from './DesktopTabGroup';

/**
 * Handles creation and pooling of Tab Group Windows
 */
export class TabWindowFactory {
    /**
     * The window pool
     */
    private _windowPool: Map<string, _Window[]> = new Map();

    constructor() {
        ApplicationConfigManager.onApplicationConfigCreated.add(this.onApplicationConfigCreated, this);

        // Creates 3 default windows in the pool.
        this._createAndPool(ApplicationConfigManager.DEFAULT_CONFIG);
        this._createAndPool(ApplicationConfigManager.DEFAULT_CONFIG);
        this._createAndPool(ApplicationConfigManager.DEFAULT_CONFIG);
    }


    /**
     * Gets the next window from the window pool.  Will return null if no window is present.
     * @param {ApplicationUIConfig} options The options for the window to retrieve.  Used as key in the window pool map.
     * @returns {_Window | undefined}
     */
    public getNextWindow(options: ApplicationUIConfig): _Window|undefined {
        const pooledWindows = this._windowPool.get(options.url) || [];
        const next = pooledWindows.shift();

        // Settimeout to offset blocking fin window creation
        // TODO: Remove once runtime has investigated
        setTimeout(() => {
            this._createAndPool(options);
        }, 2000);

        return next;
    }

    /**
     * Handles when an application configuration has been added.
     * @param uuid Uuid of the application which the config was added for.
     * @param config The configuration added.
     */
    private onApplicationConfigCreated(uuid: string, config: ApplicationUIConfig) {
        this._createAndPool(config);
    }

    /**
     * Creates and pools windows against a specific ApplicationUI configuration.
     * @param {ApplicationUIConfig} options The configuration to create the windows against.
     */
    private _createAndPool(options: ApplicationUIConfig) {
        if (!this._windowPool.has(options.url)) {
            this._createWindow(options).then((window) => {
                this._windowPool.set(options.url, [window]);
            });
        } else if (this._windowPool.has(options.url) && this._windowPool.get(options.url)!.length < 3) {
            this._createWindow(options).then((window) => {
                this._windowPool.set(options.url, [...this._windowPool.get(options.url)!, window]);
            });
        }
    }

    /**
     * Creates a single non-pooled window.
     * @param {ApplicationUIConfig} options The configuration to create the windows against.
     */
    private _createWindow(options: ApplicationUIConfig) {
        return fin.Window.create({
            name: createTabGroupId(),
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
            waitForPageLoad: false
        });
    }
}