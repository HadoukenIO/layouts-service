import { TabAPIMessage, TabAPIWindowActions } from "../../shared/types";
import { sendAction } from "./ClientUtilities";

export class ClientUIWindowActions {
	/**
	 * @public
	 * @function maximize Maximizes the tab client window.
	 */
	public maximize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.MAXIMIZE };

		sendAction(payload);
	}

	/**
	 * @public
	 * @function minmize Minimizes the tab client window.
	 */
	public minimize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.MINIMIZE };

		sendAction(payload);
	}

	/**
	 * @public
	 * @function restore Restores the tab client from a minimized or maximized state.
	 */
	public restore(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.RESTORE };

		sendAction(payload);
	}

	/**
	 * @public
	 * @function close Closes the tab client window.
	 */
	public close(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.CLOSE };

		sendAction(payload);
	}
}
