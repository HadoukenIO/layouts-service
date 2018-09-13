import {ApplicationUIConfig} from '../../../client/types';

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
    private static DEFAULT_CONFIG: ApplicationUIConfig = {url: DEFAULT_UI_URL, height: 60};

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
        }
    }

    /**
     * Checks to see if the uuid exists in the container
     * @param uuid The uuid to search for
     */
    public exists(uuid: string): boolean {
        return this.mApplicationUIConfigurations[uuid] ? true : false;
    }

    /**
     * Checks and Compares two UUIDs to see if they have compatible UIs for tabbing.
     * @param {string} uuid The first uuid to compare
     * @param {string} otherUuid THe other uuid to compare
     */
    public compareConfigBetweenApplications(uuid: string, otherUuid: string): boolean {
        const config: ApplicationUIConfig|undefined = this.getApplicationUIConfig(uuid);
        const otherConfig: ApplicationUIConfig|undefined = this.getApplicationUIConfig(otherUuid);

        return ((config && otherConfig && config.url === otherConfig.url) || (!config && !otherConfig));
    }
}