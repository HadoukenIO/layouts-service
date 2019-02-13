import {Elements} from './View';

enum eLogStatus {
    INFO,
    PENDING,
    SUCCESS,
    FAIL
}

interface LogItem {
    caption: string;
    status: eLogStatus;
    element: HTMLLIElement;
    promise?: Promise<any>;  // tslint:disable-line:no-any
}

export class EventsUI {
    private static STATUS_CLASSES: {[key: number]: string} = (() => {
        const map: {[key: number]: string} = {};
        map[eLogStatus.INFO] = 'text-primary';
        map[eLogStatus.PENDING] = 'text-info';
        map[eLogStatus.SUCCESS] = 'text-success';
        map[eLogStatus.FAIL] = 'text-danger';
        return map;
    })();

    private _list!: HTMLElement;
    private _log: LogItem[];

    constructor(elements: Elements) {
        this._list = elements.eventList;
        this._log = [];
    }

    // tslint:disable-next-line:no-any
    public addApiCall<T>(promise: Promise<T>, api: Function, ...args: any[]): void {
        this.addItem(
            `Calling ${api.name}(${
                args.map((arg) => {
                        if (typeof arg === 'object') {
                            try {
                                return JSON.stringify(arg);
                            } catch (e) {
                                return arg && arg.toString();
                            }
                        } else {
                            return arg && arg.toString();
                        }
                    })
                    .join(', ')})`,
            eLogStatus.PENDING,
            promise);
    }

    public addEvent(event: Event): void {
        this.addItem(`Recieved Event: ${event.type}`, eLogStatus.INFO);
    }

    private addItem<T>(caption: string, status: eLogStatus, promise?: Promise<T>): void {
        const element = document.createElement('li');
        element.innerText = status === eLogStatus.PENDING ? `${caption}...` : caption;
        element.classList.add(EventsUI.STATUS_CLASSES[status]);

        const item = {caption, status, promise, element};
        this._list.appendChild(element);
        this._log.push(item);

        if (promise) {
            promise.then(
                () => {
                    this.updateStatus(item, eLogStatus.SUCCESS);
                },
                (reason?: Error|string) => {
                    if (reason) {
                        item.caption += `\n${reason.toString()}`;
                    }
                    this.updateStatus(item, eLogStatus.FAIL);
                });
        }
    }

    private updateStatus(item: LogItem, status: eLogStatus): void {
        item.element.innerText = item.caption;
        item.element.classList.remove(EventsUI.STATUS_CLASSES[item.status]);
        item.element.classList.add(EventsUI.STATUS_CLASSES[status]);
        item.status = status;
    }
}
