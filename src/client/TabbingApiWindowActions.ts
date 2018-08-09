import { TabAPIWindowActions } from "../shared/APITypes";
import { TabAPIMessage } from "../shared/types";
import { Api } from "./Api";

/**
 * @class Handles window actions for the tab strip
 */
export class TabbingApiWindowActions extends Api {

    /**
     * @constructor Constructor fot the TabingApiWindowActions
     */
    constructor() {
        super();
    }

	/**
	 * @public
	 * @function maximize Maximizes the tab client window.
	 */
	public maximize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.MAXIMIZE };

        super.sendAction(payload);
	}

	/**
	 * @public
	 * @function minmize Minimizes the tab client window.
	 */
	public minimize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.MINIMIZE };

        super.sendAction(payload);
	}

	/**
	 * @public
	 * @function restore Restores the tab client from a minimized or maximized state.
	 */
	public restore(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.RESTORE };

        super.sendAction(payload);
	}

	/**
	 * @public
	 * @function close Closes the tab client window.
	 */
	public close(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.CLOSE };

        super.sendAction(payload);
	}

	/**
	 * @public
	 * @function toggleMaximize Restores if the window is maximized, if not will maximize.
	 */
	public toggleMaximize(): void {
		const payload: TabAPIMessage = { action: TabAPIWindowActions.TOGGLEMAXIMIZE };

        super.sendAction(payload);
	}
}
