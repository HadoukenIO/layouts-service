import {ApplicationUIConfig} from '../../../client/types';
import {Signal2} from '../../Signal';

export const DEFAULT_UI_URL = (() => {
    let providerLocation = window.location.href;

    if (providerLocation.indexOf('http://localhost') === 0) {
        // Work-around for fake provider used within test runner
        providerLocation = providerLocation.replace('/test', '/provider');
    }

    // Locate the default tabstrip HTML page, relative to the location of the provider
    return providerLocation.replace('provider.html', 'tabbing/tabstrip/tabstrip.html');
})();

/**
 * Class that handles which application configuration to use for the app and all its child windows
 */
export class ApplicationConfigManager {
    public static readonly DEFAULT_CONFIG: ApplicationUIConfig = {url: DEFAULT_UI_URL, height: 60};

    /**
     * When an application config is added to the stack
     */
    public static onApplicationConfigCreated: Signal2<string, ApplicationUIConfig> = new Signal2();

    /**
     * @private
     * Container for all application configurations
     */
    private mApplicationUIConfigurations: {[uuid: string]: ApplicationUIConfig};

    /**
     * Constructor for ApplicationConfigManager class
     */
    constructor() {
        this.mApplicationUIConfigurations = {};
    }

    /**
     * Retrieves the ui config for the given application UUID.
     *
     * If no custom config has been registered by an application, the config of the built-in tabstrip will be returned.
     *
     * @param {string} uuid The uuid of the application to bind the window options to
     */
    public getApplicationUIConfig(uuid: string): ApplicationUIConfig {
        return this.mApplicationUIConfigurations[uuid] || ApplicationConfigManager.DEFAULT_CONFIG;
    }

    /**
     * Adds tab window options bound to the uuid
     * @param {string} uuid The uuid of the application to bind the window options to
     * @param {ApplicationUIConfig} config The window options of the application to bind the uuid
     */
    public addApplicationUIConfig(uuid: string, config: ApplicationUIConfig): void {
        if (!this.exists(uuid)) {
            this.mApplicationUIConfigurations[uuid] = config;
            ApplicationConfigManager.onApplicationConfigCreated.emit(uuid, config);
        }
    }

    /**
     * Checks to see if the uuid exists in the container
     * @param uuid The uuid to search for
     */
    public exists(uuid: string): boolean {
        return this.mApplicationUIConfigurations.hasOwnProperty(uuid);
    }

    /**
     * Checks and Compares two UUIDs to see if they have compatible UIs for tabbing.
     * @param {string|ApplicationUIConfig} app1 The first application to compare - either an application UUID, or an application's config
     * @param {string|ApplicationUIConfig} app2 The second application to compare - either an application UUID, or an application's config
     */
    public compareConfigBetweenApplications(app1: string|ApplicationUIConfig, app2: string|ApplicationUIConfig): boolean {
        const config1: ApplicationUIConfig = (typeof app1 === 'string') ? this.getApplicationUIConfig(app1) : app1;
        const config2: ApplicationUIConfig = (typeof app2 === 'string') ? this.getApplicationUIConfig(app2) : app2;

        return config1.url === config2.url;
    }
}