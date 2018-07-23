import { ClientUIIABTopics, TabIndentifier, TabPackage, TabProperties } from "../../shared/types";
import { TabGroup } from "./TabGroup";
import { TabWindow } from "./TabWindow";

export class Tab {
	private readonly _tabID: TabIndentifier;
	private readonly _tabGroup: TabGroup;

	private _tabProperties: TabProperties = {};
	private _tabWindow: TabWindow;

	constructor(tabPackage: TabPackage, tabGroup: TabGroup) {
		this._tabID = tabPackage.tabID;
		this._tabGroup = tabGroup;

		if (tabPackage.tabProps) {
			this._tabProperties = tabPackage.tabProps;
		}

		this._tabWindow = new TabWindow(this, tabPackage.tabID);
	}

	public async init() {
		await this._tabWindow.init();

		this._tabProperties = this._loadTabProperties();

		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this._tabGroup.ID, ClientUIIABTopics.TABADDED, this._tabProperties); // TODO;
	}

	public async remove(closeApp: boolean) {
		await new Promise((res, rej) => {
			this._tabWindow.finWindow.leaveGroup(res, rej);
		});

		if (closeApp) {
			await this._tabWindow.close(false);
		}

		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this._tabGroup.ID, ClientUIIABTopics.TABREMOVED, this._tabID);
	}

	public updateTabProperties(props: TabProperties) {
		this._tabProperties = { ...this._tabProperties, ...props };
		fin.desktop.InterApplicationBus.send(fin.desktop.Application.getCurrent().uuid, this._tabGroup.ID, ClientUIIABTopics.PROPERTIESUPDATED, props);

		this._saveTabProperties();
	}

	private _saveTabProperties() {
		localStorage.setItem(JSON.stringify(this._tabID), JSON.stringify(this._tabProperties));
	}

	private _loadTabPropertiesFromStorage(): TabProperties {
		const props = localStorage.getItem(JSON.stringify(this._tabID));

		if (props) {
			return JSON.parse(props);
		} else {
			return {};
		}
	}

	private _loadTabProperties(): TabProperties {
		const windowOptions = this._tabWindow.windowOptions;

		const storageProps: TabProperties = this._loadTabPropertiesFromStorage();
		const windowIcon = windowOptions.icon && windowOptions.icon.length > 0 ? windowOptions.icon : `https://www.google.com/s2/favicons?domain=${windowOptions.url}`;

		return {
			icon: this._tabProperties.icon || storageProps.icon || windowIcon,
			title: this._tabProperties.title || storageProps.title || windowOptions.name
		};
	}

	public get tabGroup(): TabGroup {
		return this._tabGroup;
	}

	public get window(): TabWindow {
		return this._tabWindow;
	}
	public get ID(): TabIndentifier {
		return this._tabID;
	}
}
