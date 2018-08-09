import { TabIdentifier } from "../../shared/types";
interface ZIndex {
    timestamp: number;
    ID: TabIdentifier;
}
/**
 * Keeps track of window Z-indexes.  Currently a POC!
 */
export declare class ZIndexer {
    /**
     * Handle to this instance.
     */
    static INSTANCE: ZIndexer;
    /**
     * The array of z-indexes of windows + IDs
     */
    private _stack;
    /**
     * Constructor of the ZIndexer class.
     */
    constructor();
    /**
     * Updates the windows index in the stack and sorts array.
     * @param ID ID of the window to update (uuid, name)
     */
    update(ID: TabIdentifier): void;
    /**
     * Returns order of zindexs for a set of window IDs.  Order is from top to bottom.
     * @param {TabIdentifier[]} ids Array of IDs to get order of.
     * @return {TabIdentifier[] | null} Array of TabIdentifiers or null
     */
    getTop(ids: TabIdentifier[]): TabIdentifier[] | null;
    /**
     * Creates window event listeners on a specified window.
     * @param win Window to add the event listeners to.
     */
    private _addEventListeners;
    /**
     * Returns the array of indexes.
     * @returns {ZIndex[]} ZIndex[]
     */
    readonly indexes: ZIndex[];
}
export {};
