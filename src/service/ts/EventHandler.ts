import { ServiceIABTopics, TabIndentifier, TabPackage, TabProperties, TabWindowOptions } from "../../shared/types";
import { TabService } from "./TabService";

export class EventHandler {
	private _service: TabService;

	constructor(service: TabService) {
		this._service = service;

		this._createListeners();
	}

	private async _createListeners() {
		fin.desktop.InterApplicationBus.subscribe("*", ServiceIABTopics.CLIENTINIT, this._onClientInit.bind(this));
		fin.desktop.InterApplicationBus.subscribe("*", ServiceIABTopics.TABEJECTED, this._onTabEjected.bind(this));
		fin.desktop.InterApplicationBus.subscribe("*", ServiceIABTopics.UPDATETABPROPERTIES, this._onUpdateTabProperties.bind(this));

		fin.desktop.System.addEventListener("monitor-info-changed", this._onMonitorInfoChanged.bind(this));
	}

	private async _onMonitorInfoChanged() {
		this._service.tabGroups.forEach(group => {
			group.realignApps();
		});
	}

	private async _onUpdateTabProperties(message: TabPackage) {
		const tab = this._service.getTab({ ...message.tabID });

		if (tab && message.tabProps) {
			tab.updateTabProperties({ ...message.tabProps });
		}
	}

	private async _onClientInit(message: TabWindowOptions, uuid: string, name: string) {
		const group = await this._service.addTabGroup(message);
		const tab = await group.addTab({ tabID: { uuid, name } });

		if (message.screenX && message.screenY) {
			await tab.window.alignPositionToTabGroup();
		} else {
			await group.window.alignPositionToApp(tab.window);
		}

		group.window.finWindow.show();

		group.setActiveTab(tab);
	}

	private async _onTabEjected(message: TabIndentifier & TabWindowOptions) {
		const ejectedTab = this._service.getTab({ uuid: message.uuid, name: message.name });
		let isOverTabWindowResult = null;

		if (!ejectedTab) {
			return;
		}

		if (message.screenX && message.screenY) {
			isOverTabWindowResult = await this._service.isPointOverTabGroup(message.screenX, message.screenY);
		}

		if (isOverTabWindowResult) {
			if (isOverTabWindowResult !== ejectedTab.tabGroup) {
				await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false);

				// TODO: Add restricting logic to disallow cross group UI tab adding.
				const tab = await isOverTabWindowResult.addTab({
					tabID: ejectedTab.ID
				});

				await tab.window.alignPositionToTabGroup();
			}
		} else {
			const originalOptions = ejectedTab.tabGroup.initialWindowOptions;
			if (message.screenX && message.screenY) {
				this._onClientInit({ url: originalOptions.url, height: originalOptions.height, screenX: message.screenX, screenY: message.screenY }, ejectedTab.ID.uuid, ejectedTab.ID.name);
			} else {
				this._onClientInit({ url: originalOptions.url, height: originalOptions.height }, ejectedTab.ID.uuid, ejectedTab.ID.name);
			}
		}
	}
}
