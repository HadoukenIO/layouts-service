import {snapAndDock} from '../../client/main';
import {WindowDockedEvent, WindowUndockedEvent, DockGroup} from '../../client/snapanddock';

import {EventsUI} from './EventsUI';
import {Elements, Messages} from './View';

export class SnapAndDockUI {
    private _buttons: HTMLButtonElement[];

    private _log: EventsUI;

    constructor(elements: Elements, log: EventsUI) {
        elements.undockWindow.addEventListener('click', (e: Event) => {
            const promise: Promise<void> = snapAndDock.undockWindow();
            log.addApiCall(promise, snapAndDock.undockWindow);
        });
        elements.undockGroup.addEventListener('click', () => {
            const promise: Promise<void> = snapAndDock.undockGroup();
            log.addApiCall(promise, snapAndDock.undockGroup);
        });
        elements.getDockGroup.addEventListener('click', () => {
            const promise: Promise<DockGroup|null> = snapAndDock.getDockedWindows();
            log.addApiCall(promise, snapAndDock.getDockedWindows);
        });

        this.onDockEvent = this.onDockEvent.bind(this);
        snapAndDock.addEventListener('window-docked', this.onDockEvent);
        snapAndDock.addEventListener('window-undocked', this.onDockEvent);

        // Query the docked state on load and update the UI accordingly. This covers the case of being reloaded while docked.
        snapAndDock.getDockedWindows().then(dockGroup => {
            if (dockGroup !== null) {
                this.toggleDocked(true);
            }
        });

        this._buttons = [elements.undockWindow, elements.undockGroup];
        this._log = log;
    }

    private onDockEvent(event: WindowDockedEvent|WindowUndockedEvent): void {
        const isDocked = (event.type === 'window-docked');

        this.toggleDocked(isDocked);

        this._log.addEvent(event);
    }

    private toggleDocked(isDocked: boolean) {
        const message = isDocked ? Messages.STATUS_DOCKED : Messages.STATUS_UNDOCKED;

        document.body.classList.toggle('docked', isDocked);
        document.getElementById('dock-status')!.innerText = message;

        // Show which buttons are useful in this state
        this._buttons.forEach(button => {
            button.classList.toggle('btn-primary', isDocked);
            button.classList.toggle('btn-secondary', !isDocked);
        });
    }
}
