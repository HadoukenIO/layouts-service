import {Elements} from './View';

export class EventsUI {
    private _list!: HTMLElement;

    constructor(elements: Elements) {
        this._list = elements.eventList;
    }

    // tslint:disable-next-line:no-any
    public add<T>(promise: Promise<T>, api: Function, ...args: any[]): void {
        console.log(`Calling ${api.name}(${args.map(a => a.toString()).join(', ')})`);
    }
}
