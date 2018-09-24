import {APIHandler} from './APIHandler';
import {DesktopModel} from './model/DesktopModel';
import {SnapService} from './snapanddock/SnapService';
import {win10Check} from './snapanddock/utils/platform';
import {TabService} from './tabbing/TabService';

export let model: DesktopModel;
export let snapService: SnapService;
export let tabService: TabService;
export let apiHandler: APIHandler;

declare const window: Window&{
    model: DesktopModel;
    snapService: SnapService;
    tabService: TabService;

    apiHandler: APIHandler;
};

fin.desktop.main(main);

export async function main() {
    model = window.model = new DesktopModel();
    snapService = window.snapService = new SnapService(model);
    tabService = window.tabService = new TabService(model);
    apiHandler = window.apiHandler = new APIHandler();

    await win10Check;
    await apiHandler.register();
}
