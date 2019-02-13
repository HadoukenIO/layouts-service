import {addSpawnListeners} from '../spawn';

import {EventsUI} from './EventsUI';
import {SnapAndDockUI} from './SnapAndDockUI';
import {TabbingUI} from './TabbingUI';
import {Elements, View} from './View';
import {WindowsUI} from './WindowsUI';

/**
 * Dictionary of user-facing strings
 */
export enum Messages {
    STATUS_DOCKED = 'Docked to one or more windows',
    STATUS_UNDOCKED = 'Window currently undocked',
    STATUS_TABBED = 'Tabbed to one or more other windows',
    STATUS_UNTABBED = 'Not tabbed'
}

/**
 * Key-value map of any query-string parameters.
 *
 * Assumes that all parameters are JSON.stringify'd.
 *
 * e.g: "?a=1&b='2'&c=3%204" => {a: 1, b: '2', c: '3 4'}
 */
export type QueryParams = {
    [key: string]: string|number|boolean|{}
};

const args: QueryParams = getQueryParams();
const view: View = new View(args);

view.ready.then((elements: Elements) => {
    const eventsUI: EventsUI = new EventsUI(elements);
    const snapAndDockUI: SnapAndDockUI = new SnapAndDockUI(elements, eventsUI);
    const tabbingUI: TabbingUI = new TabbingUI(elements, eventsUI);
    const windowUI: WindowsUI = new WindowsUI(elements);

    // Make objects accessible from the debugger
    Object.assign(window, {view, eventsUI, snapAndDockUI, tabbingUI, windowUI});

    // Listen for requests to spawn child windows/applications
    addSpawnListeners();
});

function getQueryParams(): QueryParams {
    const params = location.search.replace(/^\?/, '').split('&');
    const args = params.reduce((args: QueryParams, queryParam: string) => {
        const [key, value] = queryParam.split('=');
        if (key !== undefined && value !== undefined) {
            try {
                args[key] = JSON.parse(decodeURIComponent(value));
            } catch (e) {
                console.warn(`Query param '${key}' couldn't be parsed. Value:`, value);
                args[key] = decodeURIComponent(value);
            }
        }
        return args;
    }, {});

    return args;
}
