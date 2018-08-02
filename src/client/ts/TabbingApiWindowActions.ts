import { TabAPIMessage, TabAPIWindowActions } from "../../shared/types";

export class TabbingApiWindowActions {

    private mSendAction: (payload: TabAPIMessage) => void;

    constructor(sendAction: (payload: TabAPIMessage) => void) {
        this.mSendAction = sendAction;
    }

	/**
	 * @public
	 * @function maximize Maximizes the tab client window.
	 */
	public maximize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.MAXIMIZE };

        this.mSendAction(payload);
	}

	/**
	 * @public
	 * @function minmize Minimizes the tab client window.
	 */
	public minimize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.MINIMIZE };

        this.mSendAction(payload);
	}

	/**
	 * @public
	 * @function restore Restores the tab client from a minimized or maximized state.
	 */
	public restore(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.RESTORE };

        this.mSendAction(payload);
	}

	/**
	 * @public
	 * @function close Closes the tab client window.
	 */
	public close(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.CLOSE };

        this.mSendAction(payload);
	}
}
