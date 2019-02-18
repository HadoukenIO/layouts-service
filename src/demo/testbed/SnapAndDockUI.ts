import {snapAndDock} from '../../client/main';
import {WindowDockedEvent, WindowUndockedEvent} from '../../client/snapanddock';

import {EventsUI} from './EventsUI';
import {Messages} from './index';
import {Elements} from './View';

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

        this.onDockEvent = this.onDockEvent.bind(this);
        snapAndDock.addEventListener('window-docked', this.onDockEvent);
        snapAndDock.addEventListener('window-undocked', this.onDockEvent);

        this._buttons = [elements.undockWindow, elements.undockGroup];
        this._log = log;
    }

    private onDockEvent(event: WindowDockedEvent|WindowUndockedEvent): void {
        const isDocked = (event.type === 'window-docked');
        const message = isDocked ? Messages.STATUS_DOCKED : Messages.STATUS_UNDOCKED;

        document.body.classList.toggle('docked', isDocked);
        document.getElementById('dock-status')!.innerText = message;

        // Show which buttons are useful in this state
        this._buttons.forEach(button => {
            button.classList.toggle('btn-primary', isDocked);
            button.classList.toggle('btn-secondary', !isDocked);
        });

        this._log.addEvent(event);
    }
}
