import {deregister, register} from '../../client/main';

import {EventsUI} from './EventsUI';
import {Elements} from './View';

export class RegistrationUI {
    constructor(elements: Elements, log: EventsUI) {
        elements.deregister.addEventListener('click', (e: Event) => {
            const promise: Promise<void> = deregister();
            log.addApiCall(promise, deregister);
        });
        elements.reregister.addEventListener('click', (e: Event) => {
            const promise: Promise<void> = register();
            log.addApiCall(promise, register);
        });
    }
}
