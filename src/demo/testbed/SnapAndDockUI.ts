import {snapAndDock} from '../../client/main';
import {WindowDockedEvent, WindowUndockedEvent} from '../../client/snapanddock';

import {EventsUI} from './EventsUI';
import {Messages} from './index';
import {Elements} from './View';

export class SnapAndDockUI {
    private _buttons: HTMLButtonElement[];

    constructor(elements: Elements, eventsUI: EventsUI) {
        elements.undockWindow.addEventListener('click', (e: Event) => {
            const promise: Promise<void> = snapAndDock.undockWindow();
            eventsUI.add(promise, snapAndDock.undockWindow);
        });
        elements.undockGroup.addEventListener('click', () => {
            const promise: Promise<void> = snapAndDock.undockGroup();
            eventsUI.add(promise, snapAndDock.undockGroup);
        });

        this.onDockEvent = this.onDockEvent.bind(this);
        snapAndDock.addEventListener('window-docked', this.onDockEvent);
        snapAndDock.addEventListener('window-undocked', this.onDockEvent);

        this._buttons = [elements.undockWindow, elements.undockGroup];
    }

    private onDockEvent(e: WindowDockedEvent|WindowUndockedEvent): void {
        const isDocked = (e.type === 'window-docked');
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
