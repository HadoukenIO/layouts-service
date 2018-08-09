import { TabIdentifier, TabProperties } from "../../../shared/types";
export declare class Tab {
    /**
     * Contains the HTML Element for the tab.
     */
    private _domNode;
    /**
     * Properties to the tab (icon, title)
     */
    private _properties;
    /**
     * ID of the Tab (uuid, name);
     */
    private _ID;
    /**
     * Constructor for the Tab class.
     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
     */
    constructor(tabID: TabIdentifier, tabProperties: TabProperties);
    /**
     * Initializes the Tab class
     */
    init(): void;
    /**
     * Removes the Tab from DOM.
     */
    remove(): void;
    /**
     * Sets the Active class on the Tab DOM.
     */
    setActive(): void;
    /**
     * Removes the Active class from the Tab DOM.
     */
    unsetActive(): void;
    /**
     * Updates the icon of this tab.
     * @param {string} icon The URL to the icon image.
     */
    updateIcon(icon?: string): void;
    /**
     * Updates the text of the tab.
     * @param {string} text Text to update with.
     */
    updateText(text: string): void;
    /**
     * Handles the HTML5 DragEvent onStart
     * @param {DragEvent} e DragEvent
     */
    private _onDragStart;
    /**
     * Handles the HTML5 DragEvent onDragEnd
     * @param {DragEvent} e DragEvent
     */
    private _onDragEnd;
    /**
     * Renders the Tab to the DOM from generation.
     */
    private _render;
    /**
     * Handles all click events from this Tab DOM.
     * @param {MouseEvent} e MouseEvent
     */
    private _onClickHandler;
    /**
     * Handles all double click events from this Tab DOM.
     * @param {MouseEvent} e MouseEvent
     */
    private _onDblClickHandler;
    /**
     * Generates the DOM for this tab.
     * @returns {HTMLElement} DOM Node
     */
    private _generateDOM;
    /**
     * Creates the input field on the tab and handles events on it.
     */
    private _handlePropertiesInput;
    /**
     * Returns tab identifier object consisting of UUID, Name
     * @returns {TabIdentifier} {uuid, name}
     */
    readonly ID: TabIdentifier;
    /**
     * Returns the DOM Node for the tab
     * @returns {HTMLElement} DOM Node
     */
    readonly DOM: HTMLElement;
}
