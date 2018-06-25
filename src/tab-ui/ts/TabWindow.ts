import { TabIndentifier } from './Tab';
import { TabManager } from "./TabManager";
import { WindowManager } from "./WindowManager";


export class TabWindow {
    private windowManager: WindowManager = new WindowManager();
    private tabManager: TabManager = new TabManager();
    private mainBoundApp!: TabIndentifier;

    constructor() {
        this._getCustomData()
        .then((customData: TabIndentifier) => {
            this.mainBoundApp = customData;
            this.tabManager.addTab({name: customData.name, uuid: customData.uuid});
            this.windowManager.window.show();
        });
    }

    private _getCustomData(): Promise<TabIndentifier>{
        return new Promise<TabIndentifier>((resolve, reject) => {
            fin.desktop.Window.getCurrent().getOptions((options) => {
                const customData = JSON.parse(options.customData);
                resolve(customData);
            });
        });
    }

}