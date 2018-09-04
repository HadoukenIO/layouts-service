import { Point } from 'hadouken-js-adapter/out/types/src/api/system/point';
import { Window } from '../../../node_modules/hadouken-js-adapter';
import { createChildWindow } from './createChildWindow';
import { delay } from './delay';
import { Corner, dragWindowToOtherWindow } from './dragWindowTo';

type MoveArgs = [number, Corner, number, Corner, Point];

type Arrangement = MoveArgs[];

/* Encodes the window positions to be tested. The format is: 
* { 
*    number of windows: { 
*        name of window arrangement: [
*            Array of window movements (executed in sequence)
*            that will create the desired arrangement of format 
*            [moved window index, moved corner, target window index, target corner, offset]
*        ]
*    }
* }
*/
export interface ArrangementsType {
    [numWindows: number]: {
        [arrangementName: string]: Arrangement
    };
}

type WindowPosition = {defaultTop:number, defaultLeft:number};
type WindowOptions = {
    autoShow: boolean,
    saveWindowState: boolean,
    defaultHeight: number,
    defaultWidth: number,
    url: string,
    frame: boolean,
    // tslint:disable-next-line:no-any
    [key: string]: any;
};

export class WindowInitializer {

    private _windowPositions: WindowPosition[];
    private _windowOptions: WindowOptions;

    private _arrangements : ArrangementsType;
    public get arrangements() : ArrangementsType {
        return this._arrangements;
    }
    
    constructor(arrangements: ArrangementsType, windowPositions?: WindowPosition[], windowOptions?: WindowOptions) {
        this._arrangements = arrangements;
        this._windowPositions = windowPositions || defaultWindowPositions;
        this._windowOptions = windowOptions || deafultWindowOptions;
    }

    public async initWindows(num:number, arrangementName?: string): Promise<Window[]> {
        const windows:Window[] = new Array<Window>(num);

        for (let i = 0; i < num; i++) {
            windows[i] = await createChildWindow({ ...(this._windowPositions[i]), ...this._windowOptions });
        }

        if (arrangementName && this._arrangements.hasOwnProperty(num) && this._arrangements[num].hasOwnProperty(arrangementName)) {
            for (const moveArgs of this._arrangements[num][arrangementName]) {
                // Destruct the move args before calling it as typescript causes issues otherwise.
                const [w1,c1,w2,c2,d] = moveArgs;
                await dragWindowToOtherWindow(windows[w1],c1,windows[w2],c2,d);
            }
        }

        // Slight delay to allow things to stablize
        await delay(500);
        
        return windows;
    }
}

const defaultWindowPositions = [
    { defaultTop: 300, defaultLeft: 300 },
    { defaultTop: 300, defaultLeft: 600 },
    { defaultTop: 600, defaultLeft: 300 },
    { defaultTop: 600, defaultLeft: 600 },
    { defaultTop: 900, defaultLeft: 300 },
    { defaultTop: 900, defaultLeft: 600 },
    { defaultTop: 300, defaultLeft: 900 },
    { defaultTop: 600, defaultLeft: 900 },
    { defaultTop: 900, defaultLeft: 900 }
];
const deafultWindowOptions = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 200,
    defaultWidth: 200,
    url: 'http://localhost:1337/demo/frameless-window.html',
    frame: false
};