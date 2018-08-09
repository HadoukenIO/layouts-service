import { Api } from "./Api";
/**
 * @class Handles window actions for the tab strip
 */
export declare class TabbingApiWindowActions extends Api {
    /**
     * @constructor Constructor fot the TabingApiWindowActions
     */
    constructor();
    /**
     * @public
     * @function maximize Maximizes the tab client window.
     */
    maximize(): void;
    /**
     * @public
     * @function minmize Minimizes the tab client window.
     */
    minimize(): void;
    /**
     * @public
     * @function restore Restores the tab client from a minimized or maximized state.
     */
    restore(): void;
    /**
     * @public
     * @function close Closes the tab client window.
     */
    close(): void;
    /**
     * @public
     * @function toggleMaximize Restores if the window is maximized, if not will maximize.
     */
    toggleMaximize(): void;
}
