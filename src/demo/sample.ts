import {Application, Identity} from 'hadouken-js-adapter';
import {WindowInfo} from 'hadouken-js-adapter/out/types/src/api/system/window';

import {snapAndDock, tabbing} from '../client/main';
import {WindowDockedEvent, WindowUndockedEvent} from '../client/snapanddock';
import {TabAddedEvent, TabRemovedEvent} from '../client/tabbing';
import {WindowIdentity} from '../client/types';

enum Messages {
    STATUS_DOCKED = 'Docked to one or more windows',
    STATUS_UNDOCKED = 'Window currently undocked',
    STATUS_TABBED = 'Tabbed to <tab-count> other windows',
    STATUS_UNTABBED = 'Not tabbed'
}

snapAndDock.addEventListener('window-docked', onDockEvent);
snapAndDock.addEventListener('window-undocked', onDockEvent);
tabbing.addEventListener('tab-added', onTabEvent);
tabbing.addEventListener('tab-removed', onTabEvent);

document.addEventListener('DOMContentLoaded', () => {
    const identity = fin.Window.me;

    // Update window content
    document.title = identity.name || identity.uuid;
    document.getElementById('title')!.innerText = `${identity.uuid} / ${identity.name}`;

    // Add button listeners
    document.getElementById('undockWindow')!.addEventListener('click', (e: Event) => {
        const promise: Promise<void> = snapAndDock.undockWindow();

        addToLog(promise, snapAndDock.undockWindow);
    });
    document.getElementById('undockGroup')!.addEventListener('click', () => {
        snapAndDock.undockGroup();
    });
    document.getElementById('removeTab')!.addEventListener('click', () => {
        tabbing.removeTab();
    });
    document.getElementById('closeTab')!.addEventListener('click', () => {
        tabbing.closeTab();
    });

    // Add any newly created windows to 'Add Tab' dropdown
    fin.System.addListener('window-created', (event) => {
        addToDropdown(event);
    });

    // Populate 'Add Tab' dropdown
    fin.System.getAllWindows().then((info: WindowInfo[]) => {
        info.forEach((window: WindowInfo) => {
            // Add main window
            addToDropdown({uuid: window.uuid, name: window.mainWindow.name});

            // Add child windows
            window.childWindows.forEach(child => {
                addToDropdown({uuid: window.uuid, name: child.name});
            });
        });
    });

    // Listen for requests to spawn child windows/applications
    const source = {uuid: 'Layouts-Manager'};
    fin.InterApplicationBus.subscribe(source, 'createAppFromManifest', createChildAppFromManifest);
    fin.InterApplicationBus.subscribe(source, 'createAppFromOptions', createChildAppFromOptions);
    fin.InterApplicationBus.subscribe(source, 'createWindow', createChildWindow);
});

const dropdownContents: (WindowIdentity&{element: HTMLAnchorElement})[] = [];
function addToDropdown(identity: WindowIdentity): void {
    const dropdown = document.getElementById('addTabDropdown')! as HTMLDivElement;
    const itemCount = dropdownContents.length;

    if (identity.uuid === 'layouts-service') {
        // Exclude any windows belonging to the service
        return;
    }

    for (let i = 0; i <= itemCount; i++) {
        const item = dropdownContents[i];
        if (i === itemCount || identity.uuid < item.uuid || identity.uuid === item.uuid && identity.name < item.name) {
            // Create & add new dropdown item
            const element = document.createElement('a');
            element.classList.add('dropdown-item');
            element.href = '#';
            element.onclick = () => {
                tabbing.addTab(identity);
                return false;
            };
            element.innerText = `${identity.uuid} / ${identity.name}`;
            if (i < itemCount) {
                dropdown.insertBefore(element, dropdownContents[i].element);
            } else {
                dropdown.appendChild(element);
            }

            // Update array
            const newItem = {element, ...identity};
            dropdownContents.splice(i, 0, newItem);

            // Remove from list if window is closed
            fin.Window.wrapSync(identity).once('closed', () => {
                removeFromDropdown(identity);
            });
            break;
        }
    }
}

function removeFromDropdown(identity: WindowIdentity): void {
    const index: number = dropdownContents.findIndex((item) => {
        return item.uuid === identity.uuid && item.name === item.name;
    });

    if (index >= 0) {
        dropdownContents[index].element.remove();
        dropdownContents.splice(index, 1);
    }
}

function onDockEvent(e: WindowDockedEvent|WindowUndockedEvent): void {
    const isDocked = (e.type === 'window-docked');
    const message = isDocked ? Messages.STATUS_DOCKED : Messages.STATUS_UNDOCKED;

    document.body.classList.toggle('docked', isDocked);
    document.getElementById('dock-status')!.innerText = message;
}

async function onTabEvent(e: TabAddedEvent|TabRemovedEvent): Promise<void> {
    const tabs: WindowIdentity[]|null = await tabbing.getTabs();
    const message: string = tabs ? Messages.STATUS_TABBED.replace('<tab-count>', '' + tabs.length) : Messages.STATUS_UNTABBED;

    document.getElementById('tab-status')!.innerText = message;
}

// tslint:disable-next-line:no-any
function addToLog<T>(promise: Promise<T>, api: Function, ...args: any[]): void {
    console.log(`Calling ${api.name}(${args.map(a => a.toString()).join(', ')})`);
}

async function createChildAppFromManifest(manifest: string): Promise<Identity> {
    return startApp(fin.Application.createFromManifest(manifest));
}

async function createChildAppFromOptions(options: fin.ApplicationOptions): Promise<Identity> {
    return startApp(fin.Application.create(options));
}

async function startApp(appPromise: Promise<Application>): Promise<Identity> {
    const app = await appPromise;
    await app.run();
    return app.identity;
}

async function createChildWindow(options: fin.WindowOptions): Promise<Identity> {
    const rootDir = location.href.slice(0, location.href.lastIndexOf('/'));
    const window = await fin.Window.create({
        url: options.url || `${rootDir}/sample.html`,
        autoShow: true,
        defaultHeight: options.defaultHeight,
        defaultWidth: options.defaultWidth,
        defaultLeft: options.defaultLeft,
        defaultTop: options.defaultTop,
        saveWindowState: options.saveWindowState,
        frame: options.frame,
        name: options.name
    });

    return window.identity;
}
