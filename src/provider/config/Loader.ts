import {Application, Identity} from 'hadouken-js-adapter';
import {ApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/application/application';
import {ApplicationEvent, WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';
import {ApplicationInfo as SystemApplicationInfo} from 'hadouken-js-adapter/out/types/src/api/system/application';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {ApplicationScope, Scope} from '../../../gen/provider/config/scope';

import {ConfigUtil} from './ConfigUtil';
import {ConfigWithRules, ScopedConfig, Store} from './Store';
import {SourceWatch} from './Watch';

/**
 * Contents of an app.json file.
 *
 * Partial declaration - only includes the fields used by Loader.
 */
interface AppManifest<T> {
    uuid: string;
    startup_app: {uuid: string};
    services?: ServiceDeclaration<T>[];
}
interface ServiceDeclaration<T> {
    name: string;
    config?: ConfigWithRules<T>;
    manifestUrl?: string;
}

interface AppState {
    scope: ApplicationScope;
    isRunning: boolean;
    parent: AppState|null;
    children: AppState[];
}

/**
 * Configuration loader, responsible for listening for application lifecycle events, and loading/unloading any
 * application-defined config to/from the store.
 */
export class Loader<T> {
    private _store: Store<T>;
    private _serviceNames: string[];

    private _appState: {[uuid: string]: AppState};

    // List of stringified window scopes that have added rules to the store.
    private _windowsWithConfig: string[];
    private _watch: SourceWatch<T>;

    constructor(store: Store<T>, serviceName: string, ...aliases: string[]) {
        this._store = store;
        this._serviceNames = aliases;
        this._serviceNames.unshift(serviceName);
        this._appState = {};

        this._windowsWithConfig = [];
        this._watch = new SourceWatch(this._store, {level: 'window', uuid: {expression: '.*'}, name: {expression: '.*'}});
        this._watch.onAdd.add(this.onConfigAddedFromWindow, this);

        // Pre-bind fin callback functions
        this.onApplicationCreated = this.onApplicationCreated.bind(this);
        this.onApplicationClosed = this.onApplicationClosed.bind(this);
        this.onWindowClosed = this.onWindowClosed.bind(this);

        // Listen for any new windows created and register their config with the service
        fin.System.addListener('application-created', this.onApplicationCreated);

        // Register any windows created before the service started
        fin.System.getAllApplications().then((apps: SystemApplicationInfo[]) => {
            apps.forEach((app: SystemApplicationInfo) => {
                // Register the main window
                this.onApplicationCreated(app);
            });
        });
    }

    private onApplicationCreated(identity: Identity): void {
        const app: Application = fin.Application.wrapSync(identity);

        app.getInfo().then((info: ApplicationInfo) => {
            const manifest: AppManifest<T> = info.manifest as AppManifest<T>;
            const parentUuid: string|undefined = info.parentUuid;

            if (manifest && manifest.startup_app.uuid === identity.uuid && manifest.services && manifest.services.length) {
                manifest.services.forEach((service: ServiceDeclaration<T>) => {
                    if (service.config && this._serviceNames.includes(service.name)) {
                        console.log(`Loading config from ${identity.uuid}/${service.name}`);

                        // Listen for Application close
                        app.once('closed', this.onApplicationClosed);

                        // Load the config from the application's manifest
                        this._store.add({level: 'application', uuid: identity.uuid}, service.config);
                    }
                });
            }

            if (parentUuid && this._appState.hasOwnProperty(parentUuid)) {
                const state = this.getAppState(identity.uuid);
                const parent = this.getAppState(parentUuid);

                state.parent = parent;
                parent.children.push(state);
            }
        });
    }

    private onApplicationClosed(event: ApplicationEvent<'application', 'closed'>): void {
        const scope: Scope = {level: 'application', uuid: event.uuid};
        const state: AppState = this._appState[scope.uuid];

        if (state) {
            // Mark application as no longer running
            state.isRunning = false;

            // Unload this application's config, unless it may be required by another application
            this.cleanUpApplicationConfig(state);
        }
    }

    /**
     * Cleans-up any config within the store for applications that are no longer running and have no child applications
     * that may be dependant on rules defined in a parent application.
     *
     * @param app An application within the hierarchy. May still be running, or could have closed already.
     */
    private cleanUpApplicationConfig(app: AppState): boolean {
        const isOrphaned = !app.children.every((child: AppState) => this.cleanUpApplicationConfig(child));

        if (isOrphaned && app.children.length === 0) {
            console.log(`Discarding config from ${app.scope.uuid}`);

            // Unload config
            this._store.removeFromSource(app.scope);

            // Clean-up AppState
            const index = app.parent ? app.parent.children.indexOf(app) : -1;
            if (index >= 0) {
                app.parent!.children.splice(index, 1);
            }
            delete this._appState[app.scope.uuid];
        } else if (isOrphaned) {
            // Sanity check, should never happen
            console.warn('An application is no longer referenced, but still has state data for one or more child applications');
        }

        return isOrphaned;
    }

    private onWindowClosed(event: WindowEvent<'window', 'closed'>): void {
        const scope: Scope = {level: 'window', uuid: event.uuid, name: event.name};

        // Remove config
        console.log(`Unloading config from Window '${scope.uuid}/${scope.name}'`);
        this._store.removeFromSource(scope);

        // Remove from list of windows with listeners
        const sourceId: string = ConfigUtil.getId(scope);
        const index: number = this._windowsWithConfig.indexOf(sourceId);
        if (index >= 0) {
            this._windowsWithConfig.splice(index, 1);
        }
    }

    private onConfigAddedFromWindow(rule: ScopedConfig<T>, source: Scope): void {
        const sourceId: string = ConfigUtil.getId(source);

        if (source.level === 'window' && !this._windowsWithConfig.includes(sourceId)) {
            this._windowsWithConfig.push(sourceId);

            fin.Window.wrapSync(source).once('closed', this.onWindowClosed);
        }
    }

    private getAppState(uuid: string): AppState {
        let state: AppState = this._appState[uuid];

        if (!state) {
            state = {scope: {level: 'application', uuid}, isRunning: true, parent: null, children: []};

            this._appState[uuid] = state;
        }

        return state;
    }
}
