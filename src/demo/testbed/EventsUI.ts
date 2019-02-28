
import {Events} from '../../client/connection';

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
    captionElement: HTMLSpanElement;
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
            'chevron-right',
            promise);
    }

    public addEvent(event: Events): void {
        this.addItem(`Recieved Event: ${event.type}`, eLogStatus.INFO, 'bolt');
    }

    private addItem<T>(caption: string, status: eLogStatus, icon: string, promise?: Promise<T>): void {
        const atEnd: boolean = this.isAtEnd();

        const iconElement = document.createElement('i');
        iconElement.classList.add('fa', 'fa-fw', `fa-${icon}`);
        const captionElement = document.createElement('span');
        captionElement.innerText = status === eLogStatus.PENDING ? `${caption}...` : caption;
        captionElement.classList.add(EventsUI.STATUS_CLASSES[status]);
        const element = document.createElement('li');
        element.appendChild(iconElement);
        element.appendChild(captionElement);

        const item: LogItem = {caption, status, promise, element, captionElement};
        this._list.appendChild(element);
        this._log.push(item);

        if (promise) {
            promise.then(
                () => {
                    this.updateStatus(item, eLogStatus.SUCCESS);
                },
                (reason?: Error|string) => {
                    const atEnd = this.isAtEnd();
                    if (reason) {
                        item.caption += `\n${reason.toString()}`;
                    }
                    this.updateStatus(item, eLogStatus.FAIL);
                    if (atEnd) {
                        this.scrollToEnd();
                    }
                });
        }

        if (atEnd) {
            this.scrollToEnd();
        }
    }

    private isAtEnd(): boolean {
        // If the last element in the events list is currently (or almost) visible
        return Math.abs(this._list.scrollTop - (this._list.scrollHeight - this._list.clientHeight)) < 100;
    }

    private scrollToEnd(): void {
        this._list.scrollTop = this._list.scrollHeight - this._list.clientHeight;
    }

    private updateStatus(item: LogItem, status: eLogStatus): void {
        item.captionElement.innerText = item.caption;
        item.captionElement.classList.remove(EventsUI.STATUS_CLASSES[item.status]);
        item.captionElement.classList.add(EventsUI.STATUS_CLASSES[status]);
        item.status = status;
    }
}
