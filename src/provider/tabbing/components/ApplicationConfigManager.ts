import {ApplicationUIConfig, TabWindowOptions} from '../../../client/types';

/**
 * Class that handles which application configuration to use for the app and all its child windows
 * @class
 */
export class ApplicationConfigManager {
    /**
     * @private
     * Container for all application configurations
     */
    private mApplicationUIConfigurations: ApplicationUIConfig;

    /**
     * Constructor for ApplicationConfigManager class
     */
    constructor() {
        this.mApplicationUIConfigurations = {};
    }

    /**
     * Retrieves the ui config given the Uuid
     * @param {string} uuid The uuid of the application to bind the window options to
     */
    public getApplicationUIConfig(uuid: string): TabWindowOptions|undefined {
        if (!this.exists(uuid)) {
            return;
        }

        return this.mApplicationUIConfigurations[uuid];
    }

    /**
     * Adds tab window options bound to the uuid
     * @param {string} uuid The uuid of the application to bind the window options to
     * @param {TabWindowOptions} config The window options of the application to bind the uuid
     */
    public addApplicationUIConfig(uuid: string, config: TabWindowOptions): void {
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
        const config: TabWindowOptions|undefined = this.getApplicationUIConfig(uuid);
        const otherConfig: TabWindowOptions|undefined = this.getApplicationUIConfig(otherUuid);

        return ((config && otherConfig && config.url === otherConfig.url) || (!config && !otherConfig));
    }
}