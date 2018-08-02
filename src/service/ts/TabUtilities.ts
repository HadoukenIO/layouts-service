import { TabIndentifier, TabWindowOptions } from "../../shared/types";

import { Tab } from "./Tab";
import { TabGroup } from "./TabGroup";
import { TabService } from "./TabService";

/**
 * @public
 * @function ejectTab Performs checks when eject is called
 * @param tabService The service itself which holds the tab groups
 * @param message Application or tab to be ejected
 */
export async function ejectTab(tabService: TabService, message: TabIndentifier & TabWindowOptions, tabGroup?: TabGroup | undefined): Promise<void> {
	const ejectedTab: Tab | undefined = tabGroup ? tabGroup.getTab({ name: message.name, uuid: message.uuid }) : tabService.getTab({ uuid: message.uuid, name: message.name });

	let isOverTabWindowResult: TabGroup | null = null;

	if (!ejectedTab) {
		return;
	}

	if (message.screenX && message.screenY) {
		isOverTabWindowResult = await tabService.isPointOverTabGroup(message.screenX, message.screenY);
	}

	if (isOverTabWindowResult) {
		if (isOverTabWindowResult !== ejectedTab.tabGroup) {
			await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);

			// TODO: Add restricting logic to disallow cross group UI tab adding.
			const tab = await isOverTabWindowResult.addTab({ tabID: ejectedTab.ID });

			tab.window.alignPositionToTabGroup();
		}
	} else {
		const originalOptions = ejectedTab.tabGroup.initialWindowOptions;
		const [tabGroupBounds] = await Promise.all([ejectedTab.tabGroup.window.getWindowBounds()]);

		if (message.screenX && message.screenY) {
			if (ejectedTab.tabGroup.tabs.length === 1) {
				ejectedTab.tabGroup.window.moveTo(message.screenX, message.screenY);
			} else {
				await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);
				initializeTab(
					{
						url: originalOptions.url,
						height: originalOptions.height,
						width: tabGroupBounds.width,
						screenX: message.screenX,
						screenY: message.screenY
					},
					ejectedTab.ID.uuid,
					ejectedTab.ID.name,
					tabService
				);
			}
		} else {
			await ejectedTab.tabGroup.removeTab(ejectedTab.ID, false, true);
			initializeTab({ url: originalOptions.url, height: originalOptions.height, width: tabGroupBounds.width }, ejectedTab.ID.uuid, ejectedTab.ID.name, tabService);
		}
	}
}

/**
 * @public
 * @function initializeTab Attaches a tab to the application
 * @param message Tab window options
 * @param uuid the uuid of the application to attach tab window to
 * @param name the name of the application to attach tab window to
 * @param tabService The tab service
 */
export async function initializeTab(message: TabWindowOptions, uuid: string, name: string, tabService: TabService): Promise<void> {
	if (tabService.getTabGroupByApp({ name, uuid })) {
		console.error("This window has already been initialised with a tab", { name, uuid });
		return;
	}

    const group: TabGroup = await tabService.addTabGroup(message);
	const tab: Tab = await group.addTab({ tabID: { uuid, name } });

	if (message.screenX && message.screenY) {
		await tab.window.alignPositionToTabGroup();
	} else {
		await group.window.alignPositionToApp(tab.window);
	}
	group.window.finWindow.show();
	group.switchTab({ uuid, name });
}
