import {WindowEvent} from 'hadouken-js-adapter/out/types/src/api/events/base';

import {ConfigStore} from '../main';
import {DesktopModel} from '../model/DesktopModel';
import {SnapService} from '../snapanddock/SnapService';

export class NativeWindowService {
    private _config: ConfigStore;
    private _model: DesktopModel;
    private _snapService: SnapService;

    constructor(config: ConfigStore, model: DesktopModel, snapService: SnapService) {
        this._config = config;
        this._model = model;
        this._snapService = snapService;
        this._init().catch(console.error);
    }

    /**
     * Initial logic that launches native window agent if configuation
     * allows it.
     */
    private async _init() {
        const layoutsServiceConfig = this._config.query({level: 'application', uuid: 'layouts-service'});
        const {features: {externalWindows: externalWindowsAllowed}} = layoutsServiceConfig;
        let externalWindowsAllowedDOS;

        try {
            // TODO: waiting for the definition of Desktop Owner Settings configuration
            ({externalWindows: externalWindowsAllowedDOS} = await (<any>fin.System).getServiceConfiguration({name: 'layouts'}));
        } catch (error) {
            console.error('External windows are disabled: Desktop Owner Settings are not configured.');
            return;
        }

        if (!externalWindowsAllowed || !externalWindowsAllowedDOS) {
            // Native windows support is not allowed via a configuration
            return;
        }

        const supportedArchs = ['x32', 'x64'];
        let {architecture} = await fin.System.getRuntimeInfo();
        if (architecture === 'ia32') {
            architecture = 'x32';
        }

        // Check if current architecture is supported for the native window agent.
        if (!supportedArchs.includes(architecture)) {
            console.warn('Current architecture is not supported for native window integration.');
            return;
        }

        await this._launchNativeWindowAgent(architecture);

        // 64-bit Windows requires both 64 and 32 bit native window agent
        if (architecture === 'x64') {
            await this._launchNativeWindowAgent('x32');
        }

        await this._registerFutureExternalWindows();
        await this._registerCurrentExternalWindows();
        await this._registerGlobalHotkeys();
    }

    /**
     * Launches native window agent via OpenFin API.
     */
    private async _launchNativeWindowAgent(architecture: string) {
        await (<any>fin.System).launchExternalProcess({
            alias: `NativeWindowAgent-${architecture}`,
            lifetime: 'application',
            listener: (args: any) => {
                console.log(`Native window agent ${args.topic} (${args.exitCode})`);
            }
        });
    }

    /**
     * Listen for external windows shown event and register only new ones.
     * Using "...-shown" event here instead of "...-created" because most external
     * windows are hidden at first when created, shown afterwards.
     */
    private async _registerFutureExternalWindows() {
        const listener = async (evt: WindowEvent<'system', 'external-window-shown'>) => {
            const {uuid} = evt;
            const identity = {uuid, name: uuid, isExternalWindow: true};
            const foundWindow = this._model.getWindow(identity);

            if (!foundWindow) {
                const wrappedExternalWindow = fin.ExternalWindow.wrapSync(identity);
                await this._model.addIfEnabled(identity);
                await this._model._zIndexer._addEventListeners(wrappedExternalWindow);
            }
        };

        await fin.System.addListener('external-window-shown', listener);
    }

    /**
     * Register any external windows created before the service started
     */
    private async _registerCurrentExternalWindows() {
        const externalWindows = await (<any>fin.System).getAllExternalWindows();

        externalWindows.forEach(async (e: any) => {
            const {uuid, visible} = e;

            if (visible) {
                const identity = {uuid, name: uuid, isExternalWindow: true};
                const wrappedExternalWindow = fin.ExternalWindow.wrapSync(identity);
                await this._model.addIfEnabled(identity);
                await this._model._zIndexer._addEventListeners(wrappedExternalWindow);
            }
        });
    }

    /**
     * Register global hotkey listener for external windows
     */
    private async _registerGlobalHotkeys() {
        const listener = async () => {
            const focusedExternalWindow = await (<any>fin.System).getFocusedExternalWindow();

            if (!focusedExternalWindow) {
                return;
            }

            focusedExternalWindow.name = focusedExternalWindow.uuid;
            focusedExternalWindow.isExternalWindow = true;

            const isRegistered = !!this._model.getWindow(focusedExternalWindow);

            if (!isRegistered) {
                return;
            }

            console.log('Global hotkey invoked on external window', focusedExternalWindow);
            this._snapService.undock(focusedExternalWindow);
        };

        await fin.GlobalHotkey.register('CommandOrControl+Shift+U', listener);
    }
}
