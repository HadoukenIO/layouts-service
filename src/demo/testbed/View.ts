import {stringify} from 'querystring';

import {QueryParams} from '.';

export interface Elements {
    // API buttons
    undockGroup: HTMLButtonElement;
    undockWindow: HTMLButtonElement;
    addTab: HTMLButtonElement;
    createTabGroup: HTMLButtonElement;
    removeTab: HTMLButtonElement;
    closeTab: HTMLButtonElement;
    maximizeTabGroup: HTMLButtonElement;
    minimizeTabGroup: HTMLButtonElement;
    restoreTabGroup: HTMLButtonElement;
    closeTabGroup: HTMLButtonElement;

    // Dropdown content
    addTabDropdown: HTMLDivElement;
    createTabGroupDropdown: HTMLDivElement;

    // Form triggers
    createApplication: HTMLButtonElement;
    createWindow: HTMLButtonElement;

    // Application form elements
    inputUUID: HTMLInputElement;
    inputURL: HTMLInputElement;
    inputRuntine: HTMLSelectElement;
    inputConfig: HTMLTextAreaElement;
    inputConfigEditor: HTMLDivElement;
    inputEditConfig: HTMLButtonElement;
    inputSaveConfig: HTMLButtonElement;
    inputParent: HTMLSelectElement;

    // Form tabs
    inputManifestTab: HTMLAnchorElement;
    inputManifestOptions: HTMLDivElement;
    inputProgrammaticTab: HTMLAnchorElement;
    inputProgrammaticOptions: HTMLDivElement;

    // Config form elements
    configEditorRules: HTMLUListElement;
    configEditorApp: HTMLAnchorElement;
    configEditorAddRule: HTMLAnchorElement;
    configEnabled: HTMLSelectElement;
    configSnap: HTMLSelectElement;
    configDock: HTMLSelectElement;
    configTab: HTMLSelectElement;
    configTabstripUrl: HTMLInputElement;
    configTabstripHeight: HTMLInputElement;

    // Other
    container: HTMLDivElement;
    eventList: HTMLUListElement;
}

export class View {
    private _elements: Elements|null;

    private _ready: Promise<Elements>;
    private _onReady!: (elements: Elements) => void;

    private _args: QueryParams;

    constructor(args: QueryParams) {
        this._elements = null;
        this._ready = new Promise(resolve => this._onReady = resolve);
        this._args = args;

        document.addEventListener('DOMContentLoaded', this.init.bind(this));
    }

    public get ready(): Promise<Elements> {
        return this._ready;
    }

    public get elements(): Elements {
        return this._elements!;
    }

    private async init(): Promise<void> {
        this._elements = {
            undockGroup: document.getElementById('undockGroup') as HTMLButtonElement,
            undockWindow: document.getElementById('undockWindow') as HTMLButtonElement,
            addTab: document.getElementById('addTab') as HTMLButtonElement,
            createTabGroup: document.getElementById('createTabGroup') as HTMLButtonElement,
            removeTab: document.getElementById('removeTab') as HTMLButtonElement,
            closeTab: document.getElementById('closeTab') as HTMLButtonElement,
            maximizeTabGroup: document.getElementById('maximizeTabGroup') as HTMLButtonElement,
            minimizeTabGroup: document.getElementById('minimizeTabGroup') as HTMLButtonElement,
            restoreTabGroup: document.getElementById('restoreTabGroup') as HTMLButtonElement,
            closeTabGroup: document.getElementById('closeTabGroup') as HTMLButtonElement,
            addTabDropdown: document.getElementById('addTabDropdown') as HTMLDivElement,
            createTabGroupDropdown: document.getElementById('createTabGroupDropdown') as HTMLDivElement,
            createApplication: document.getElementById('createApplication') as HTMLButtonElement,
            createWindow: document.getElementById('createWindow') as HTMLButtonElement,
            inputUUID: document.getElementById('inputUUID') as HTMLInputElement,
            inputURL: document.getElementById('inputURL') as HTMLInputElement,
            inputRuntine: document.getElementById('inputRuntine') as HTMLSelectElement,
            inputConfig: document.getElementById('inputConfig') as HTMLTextAreaElement,
            inputConfigEditor: document.getElementById('inputConfigEditor') as HTMLDivElement,
            inputEditConfig: document.getElementById('inputEditConfig') as HTMLButtonElement,
            inputSaveConfig: document.getElementById('inputSaveConfig') as HTMLButtonElement,
            inputParent: document.getElementById('inputParent') as HTMLSelectElement,
            inputManifestTab: document.getElementById('inputManifestTab') as HTMLAnchorElement,
            inputManifestOptions: document.getElementById('inputManifestOptions') as HTMLDivElement,
            inputProgrammaticTab: document.getElementById('inputProgrammaticTab') as HTMLAnchorElement,
            inputProgrammaticOptions: document.getElementById('inputProgrammaticOptions') as HTMLDivElement,
            configEditorRules: document.getElementById('configEditorRules') as HTMLUListElement,
            configEditorApp: document.getElementById('configEditorApp') as HTMLAnchorElement,
            configEditorAddRule: document.getElementById('configEditorAddRule') as HTMLAnchorElement,
            configEnabled: document.getElementById('configEnabled') as HTMLSelectElement,
            configSnap: document.getElementById('configSnap') as HTMLSelectElement,
            configDock: document.getElementById('configDock') as HTMLSelectElement,
            configTab: document.getElementById('configTab') as HTMLSelectElement,
            configTabstripUrl: document.getElementById('configTabstripUrl') as HTMLInputElement,
            configTabstripHeight: document.getElementById('configTabstripHeight') as HTMLInputElement,
            container: document.getElementById('container') as HTMLDivElement,
            eventList: document.getElementById('eventList') as HTMLUListElement
        };

        // Set window title
        const identity = fin.Window.me;
        document.title = identity.name || identity.uuid;
        document.getElementById('title')!.innerText = `${identity.uuid} / ${identity.name}`;

        // Start app initialisation
        this._onReady(this._elements);

        // Override background colors on Layout-Manager windows
        const match = /Window(\d+)/.exec(fin.Window.getCurrentSync().identity.name!);
        if (match) {
            const colors = ['#7B7BFF', '#A7A7A7', '#3D4059', '#D8D8D8', '#1A194D', '#B6B6B6'];
            const index = Number.parseInt(match[1].toString(), 10);
            const color = colors[(index - 1) % colors.length];

            this._args.theme = color;
        }

        // If border property isn't specified, default to the framed status of the window
        if (this._args.border === undefined) {
            this._args.border = !(await fin.Window.getCurrentSync().getOptions()).frame;
        }

        const {section, locked, theme, border} = this._args;
        if (section) {
            // Allow customisation of default section
            // This is the part of the UI that is kept, when window is only small enough to show one card
            Array.from(document.getElementsByClassName('card')).forEach((card) => {
                card.classList.toggle('small', card.id === section);
            });
        }
        if (locked) {
            // Lock the view to just the default section
            document.body.classList.add('locked');
        }
        if (theme) {
            // Change the color scheme of the cards
            const cards = Array.from(document.getElementsByClassName('card')) as HTMLElement[];
            cards.forEach((card) => {
                card.style.backgroundColor = theme as string;
            });

            const match = /rgb\((\d+), (\d+), (\d+)\)/g.exec(cards[0] && cards[0].style.backgroundColor!);
            if (match) {
                // Set the text color based on the background color
                const components: number[] = Array.from(match).slice(1).map(n => Number.parseInt(n, 10));
                const luminence = components[0] = ((0.2126 * components[0]) + (0.7152 * components[1]) + (0.0722 * components[2])) / 255;
                const textColor = luminence > 0.5 ? 'black' : 'white';
                cards.forEach((card) => {
                    card.style.color = textColor;
                });
            }
        }
        if (border) {
            // Add a border to the outside of the window
            this._elements.container.style.borderWidth = '2px';
            this._elements.container.classList.add('border');
        }
    }
}
