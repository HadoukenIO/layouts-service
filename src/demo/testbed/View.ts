import {QueryParams} from './App';

/**
 * Dictionary of user-facing strings
 */
export enum Messages {
    STATUS_DOCKED = 'Docked to one or more windows',
    STATUS_UNDOCKED = 'Window currently undocked',
    STATUS_TABBED = 'Tabbed to one or more other windows',
    STATUS_UNTABBED = 'Not tabbed'
}

export interface Elements {
    // API buttons
    undockGroup: HTMLButtonElement;
    undockWindow: HTMLButtonElement;
    getDockGroup: HTMLButtonElement;
    tabToSelf: HTMLButtonElement;
    tabSelfTo: HTMLButtonElement;
    createTabGroup: HTMLButtonElement;
    removeTab: HTMLButtonElement;
    closeTab: HTMLButtonElement;
    getTabGroup: HTMLButtonElement;
    maximizeTabGroup: HTMLButtonElement;
    minimizeTabGroup: HTMLButtonElement;
    restoreTabGroup: HTMLButtonElement;
    closeTabGroup: HTMLButtonElement;
    deregister: HTMLButtonElement;
    reregister: HTMLButtonElement;

    // Dropdown content
    tabToSelfDropdown: HTMLDivElement;
    tabSelfToDropdown: HTMLDivElement;
    createTabGroupDropdown: HTMLDivElement;

    // Form triggers
    createApplication: HTMLButtonElement;
    createWindow: HTMLButtonElement;

    // Application form elements
    inputID: HTMLInputElement;
    inputURL: HTMLInputElement;
    inputSection: HTMLSelectElement;
    inputFrame: HTMLSelectElement;
    inputState: HTMLSelectElement;
    inputSize: HTMLSelectElement;
    inputSizeRandomize: HTMLSelectElement;
    inputUseService: HTMLSelectElement;
    inputRuntime: HTMLSelectElement;
    inputRealmName: HTMLInputElement;
    inputEnableMesh: HTMLInputElement;
    inputConfig: HTMLTextAreaElement;
    inputConfigEditor: HTMLDivElement;
    inputEditConfig: HTMLButtonElement;
    inputSaveConfig: HTMLButtonElement;
    inputParent: HTMLSelectElement;
    inputCreate: HTMLButtonElement;
    inputCreateAndClose: HTMLButtonElement;

    // Form tabs
    inputManifestTab: HTMLAnchorElement;
    inputManifestOptions: HTMLDivElement;
    inputProgrammaticTab: HTMLAnchorElement;
    inputProgrammaticOptions: HTMLDivElement;

    // Config form elements
    configEditorRules: HTMLUListElement;
    configEditorApp: HTMLAnchorElement;
    configEditorAddRule: HTMLAnchorElement;
    configUUID: HTMLInputElement;
    configName: HTMLInputElement;
    configScope: HTMLSpanElement;
    configEnabled: HTMLSelectElement;
    configSnap: HTMLSelectElement;
    configDock: HTMLSelectElement;
    configTab: HTMLSelectElement;
    configTabstripUrl: HTMLInputElement;
    configTabstripHeight: HTMLInputElement;
    activeOpacitySnap: HTMLSelectElement;
    targetOpacitySnap: HTMLSelectElement;
    activeOpacityTab: HTMLSelectElement;
    targetOpacityTab: HTMLSelectElement;

    // Other
    container: HTMLDivElement;
    modal: HTMLDivElement;
    eventList: HTMLUListElement;
}

export class View {
    private _elements: Elements;

    constructor(args: QueryParams) {
        this._elements = this.getElements();
        this.init(args);
    }

    public get elements(): Elements {
        return this._elements!;
    }

    private getElements(): Elements {
        return {
            undockGroup: document.getElementById('undockGroup') as HTMLButtonElement,
            undockWindow: document.getElementById('undockWindow') as HTMLButtonElement,
            getDockGroup: document.getElementById('getDockGroup') as HTMLButtonElement,
            tabToSelf: document.getElementById('tabToSelf') as HTMLButtonElement,
            tabSelfTo: document.getElementById('tabSelfTo') as HTMLButtonElement,
            createTabGroup: document.getElementById('createTabGroup') as HTMLButtonElement,
            removeTab: document.getElementById('removeTab') as HTMLButtonElement,
            closeTab: document.getElementById('closeTab') as HTMLButtonElement,
            getTabGroup: document.getElementById('getTabGroup') as HTMLButtonElement,
            maximizeTabGroup: document.getElementById('maximizeTabGroup') as HTMLButtonElement,
            minimizeTabGroup: document.getElementById('minimizeTabGroup') as HTMLButtonElement,
            restoreTabGroup: document.getElementById('restoreTabGroup') as HTMLButtonElement,
            closeTabGroup: document.getElementById('closeTabGroup') as HTMLButtonElement,
            deregister: document.getElementById('deregister') as HTMLButtonElement,
            reregister: document.getElementById('reregister') as HTMLButtonElement,
            tabToSelfDropdown: document.getElementById('tabToSelfDropdown') as HTMLDivElement,
            tabSelfToDropdown: document.getElementById('tabSelfToDropdown') as HTMLDivElement,
            createTabGroupDropdown: document.getElementById('createTabGroupDropdown') as HTMLDivElement,
            createApplication: document.getElementById('createApplication') as HTMLButtonElement,
            createWindow: document.getElementById('createWindow') as HTMLButtonElement,
            inputID: document.getElementById('inputID') as HTMLInputElement,
            inputURL: document.getElementById('inputURL') as HTMLInputElement,
            inputSection: document.getElementById('inputSection') as HTMLSelectElement,
            inputFrame: document.getElementById('inputFrame') as HTMLSelectElement,
            inputState: document.getElementById('inputState') as HTMLSelectElement,
            inputSize: document.getElementById('inputSize') as HTMLSelectElement,
            inputSizeRandomize: document.getElementById('inputSizeRandomize') as HTMLSelectElement,
            inputUseService: document.getElementById('inputUseService') as HTMLSelectElement,
            inputRuntime: document.getElementById('inputRuntime') as HTMLSelectElement,
            inputRealmName: document.getElementById('inputRealmName') as HTMLInputElement,
            inputEnableMesh: document.getElementById('inputEnableMesh') as HTMLInputElement,
            inputConfig: document.getElementById('inputConfig') as HTMLTextAreaElement,
            inputConfigEditor: document.getElementById('inputConfigEditor') as HTMLDivElement,
            inputEditConfig: document.getElementById('inputEditConfig') as HTMLButtonElement,
            inputSaveConfig: document.getElementById('inputSaveConfig') as HTMLButtonElement,
            inputParent: document.getElementById('inputParent') as HTMLSelectElement,
            inputCreate: document.getElementById('inputCreate') as HTMLButtonElement,
            inputCreateAndClose: document.getElementById('inputCreateAndClose') as HTMLButtonElement,
            inputManifestTab: document.getElementById('inputManifestTab') as HTMLAnchorElement,
            inputManifestOptions: document.getElementById('inputManifestOptions') as HTMLDivElement,
            inputProgrammaticTab: document.getElementById('inputProgrammaticTab') as HTMLAnchorElement,
            inputProgrammaticOptions: document.getElementById('inputProgrammaticOptions') as HTMLDivElement,
            configEditorRules: document.getElementById('configEditorRules') as HTMLUListElement,
            configEditorApp: document.getElementById('configEditorApp') as HTMLAnchorElement,
            configEditorAddRule: document.getElementById('configEditorAddRule') as HTMLAnchorElement,
            configUUID: document.getElementById('configUUID') as HTMLInputElement,
            configName: document.getElementById('configName') as HTMLInputElement,
            configScope: document.getElementById('configScope') as HTMLSpanElement,
            configEnabled: document.getElementById('configEnabled') as HTMLSelectElement,
            configSnap: document.getElementById('configSnap') as HTMLSelectElement,
            configDock: document.getElementById('configDock') as HTMLSelectElement,
            configTab: document.getElementById('configTab') as HTMLSelectElement,
            configTabstripUrl: document.getElementById('configTabstripUrl') as HTMLInputElement,
            configTabstripHeight: document.getElementById('configTabstripHeight') as HTMLInputElement,
            activeOpacitySnap: document.getElementById('activeOpacitySnap') as HTMLSelectElement,
            targetOpacitySnap: document.getElementById('targetOpacitySnap') as HTMLSelectElement,
            activeOpacityTab: document.getElementById('activeOpacityTab') as HTMLSelectElement,
            targetOpacityTab: document.getElementById('targetOpacityTab') as HTMLSelectElement,
            container: document.getElementById('container') as HTMLDivElement,
            modal: document.getElementById('modalCreate') as HTMLDivElement,
            eventList: document.getElementById('eventList') as HTMLUListElement
        };
    }

    private init(args: QueryParams): void {
        // Set window title
        const identity = fin.Window.me;
        document.getElementById('title')!.innerText = document.title = `${identity.uuid} / ${identity.name}`;

        const {section, locked, theme, framed, border} = args;
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
            const cards = Array.from(document.getElementsByClassName('themed')) as HTMLElement[];
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

                const muted = Array.from(document.getElementsByClassName('text-muted')) as HTMLElement[];
                const mutedColor = luminence > 0.5 ? '#6c757d' : '#8d979f';
                muted.forEach((element) => {
                    element.setAttribute('style', `color: ${mutedColor}!important`);
                });
            }
        }
        if (framed) {
            // Tag the body as being framed. Will hide the title bar
            document.body.classList.add('framed');
        }
        if (border) {
            // Add a border to the outside of the window
            this._elements.container.style.borderWidth = '2px';
            this._elements.container.classList.add('border');
        }
    }
}
