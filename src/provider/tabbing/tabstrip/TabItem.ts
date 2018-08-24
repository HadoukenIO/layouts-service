import {TabIdentifier, TabProperties} from '../../../client/types';
import {TabManager} from './TabManager';

export class Tab {
    /**
     * Contains the HTML Element for the tab.
     */
    private _domNode!: HTMLElement;

    /**
     * Properties to the tab (icon, title)
     */
    private _properties: TabProperties;

    /**
     * ID of the Tab (uuid, name);
     */
    private _ID: TabIdentifier;

    /**
     * Handle to the TabManager
     */
    private _tabManager: TabManager;

    /**
     * Constructor for the Tab class.
     * @param {TabIdentifier} tabID An object containing the uuid, name for the external application/window.
     * @param {TabManager} tabManager Reference to the tab manager handling this tab.
     */
    constructor(tabID: TabIdentifier, tabProperties: TabProperties, tabManager: TabManager) {
        this._ID = tabID;
        this._properties = tabProperties;
        this._tabManager = tabManager;
    }

    /**
     * Initializes the Tab class
     */
    public init(index: number) {
        this._render(index);
    }

    /**
     * Removes the Tab from DOM.
     */
    public remove(): void {
        this._domNode.remove();
    }

    /**
     * Sets the Active class on the Tab DOM.
     */
    public setActive(): void {
        this._domNode.classList.add('active');
    }

    /**
     * Removes the Active class from the Tab DOM.
     */
    public unsetActive(): void {
        this._domNode.classList.remove('active');
    }

    /**
     * Updates the icon of this tab.
     * @param {string} icon The URL to the icon image.
     */
    public updateIcon(icon = ''): void {
        const iconNode = this._domNode.querySelectorAll('.tab-favicon')[0];
        (iconNode as HTMLElement).style.backgroundImage = `url("${icon}")`;

        this._properties.icon = icon;
    }

    /**
     * Updates the text of the tab.
     * @param {string} text Text to update with.
     */
    public updateText(text: string): void {
        const textNode = this._domNode.querySelectorAll('.tab-content')[0];
        (textNode as HTMLElement).textContent = text;

        this._properties.title = text;
    }
    /**
     * Handles the HTML5 DragEvent onStart
     * @param {DragEvent} e DragEvent
     */
    private _onDragStart(e: DragEvent): boolean {
        e.dataTransfer.effectAllowed = 'move';

        TabManager.tabAPI.startDrag();
        return true;
    }

    /**
     * Handles the HTML5 DragEvent onDragEnd
     * @param {DragEvent} e DragEvent
     */
    private _onDragEnd(e: DragEvent): void {
        // @ts-ignore
        TabManager.tabAPI.endDrag(e, this._ID.uuid, this._ID.name);
    }

    /**
     * Renders the Tab to the DOM from generation.
     */
    private _render(index: number): void {
        this._domNode = this._generateDOM();
        if (index > this._tabManager.getTabs.length) {
            TabManager.tabContainer.appendChild(this._domNode);
        } else if (index === 0) {
            TabManager.tabContainer.insertAdjacentElement('afterbegin', this._domNode);
        } else {
            const prevTab = this._tabManager.getTabs[index - 1];
            prevTab._domNode.insertAdjacentElement('afterend', this._domNode);
        }

        this.updateText(this._properties.title!);
        this.updateIcon(this._properties.icon!);
    }

    /**
     * Handles all mouseDown events from this Tab DOM.
     * @param {MouseEvent} e MouseEvent
     */
    private _onMouseDownHandler(e: MouseEvent): void {
        this.setActive();
        TabManager.tabAPI.activateTab(this._ID.uuid, this._ID.name);
    }


    /**
     * Handles all click events from this Tab DOM.
     * @param {MouseEvent} e MouseEvent
     */
    private _onClickHandler(e: MouseEvent): void {
        switch ((e.target as Element).className) {
            case 'tab-exit': {
                TabManager.tabAPI.closeTab(this._ID.uuid, this._ID.name);

                break;
            }
            default: { TabManager.tabAPI.activateTab(this._ID.uuid, this._ID.name); }
        }
    }

    /**
     * Handles all double click events from this Tab DOM.
     * @param {MouseEvent} e MouseEvent
     */
    private _onDblClickHandler(e: MouseEvent): void {
        switch ((e.target as Element).className) {
            case 'tab-content':
            case 'tab-content-wrap': {
                this._handlePropertiesInput();
                break;
            }
            default: {
                // @ts-ignore
                window.Tab.activateTab(this._ID.uuid, this._ID.name);
            }
        }
    }

    /**
     * Generates the DOM for this tab.
     * @returns {HTMLElement} DOM Node
     */
    private _generateDOM(): HTMLElement {
        // Get tab template from HTML (index.html)
        const tabTemplate: HTMLTemplateElement = (document.getElementById('tab-template') as HTMLTemplateElement)!;
        const tabTemplateDocFrag: DocumentFragment = document.importNode(tabTemplate.content, true);
        const tab: HTMLElement = tabTemplateDocFrag.firstElementChild as HTMLElement;

        // Set the onclick, drag events to top tab DOM.
        tab.onclick = this._onClickHandler.bind(this);
        tab.ondblclick = this._onDblClickHandler.bind(this);
        tab.onmousedown = this._onMouseDownHandler.bind(this);
        tab.addEventListener('dragstart', this._onDragStart.bind(this), true);
        tab.addEventListener('dragend', this._onDragEnd.bind(this), true);

        // Add custom data tags to track tabidentity from DOM
        tab.dataset.name = this._ID.name;
        tab.dataset.uuid = this._ID.uuid;

        return tab;
    }

    /**
     * Creates the input field on the tab and handles events on it.
     */
    private _handlePropertiesInput(): void {
        const textNode: Element = this._domNode.querySelectorAll('.tab-content')[0];
        const textNodeValue: string|null = textNode.textContent;
        textNode.textContent = '';

        const inputNode: HTMLInputElement = document.createElement('input');

        inputNode.value = textNodeValue || '';

        function _onBlur(): void {
            try {
                inputNode.remove();
                // @ts-ignore
                TabManager.tabAPI.updateTabProperties(this._ID.uuid, this._ID.name, {title: inputNode.value});
            } catch (e) {
            }
        }

        inputNode.addEventListener('keypress', keyEvent => {
            const key = keyEvent.which || keyEvent.keyCode;
            if (key === 13) {
                _onBlur();
            }
        });

        inputNode.addEventListener('blur', _onBlur.bind(this));

        textNode.insertAdjacentElement('afterbegin', inputNode);
        inputNode.focus();
    }

    /**
     * Returns tab identifier object consisting of UUID, Name
     * @returns {TabIdentifier} {uuid, name}
     */
    public get ID(): TabIdentifier {
        return {uuid: this._ID.uuid, name: this._ID.name};
    }

    /**
     * Returns the DOM Node for the tab
     * @returns {HTMLElement} DOM Node
     */
    public get DOM(): HTMLElement {
        return this._domNode;
    }
}
