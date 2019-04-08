import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';
import {Window} from '../../../node_modules/hadouken-js-adapter';
import {createChildWindow} from './createChildWindow';
import {delay} from './delay';
import {Corner, dragWindowToOtherWindow} from './dragWindowTo';

type MoveArgs = [number, Corner, number, Corner, Point];

type Arrangement = MoveArgs[];

/* Encodes the window positions to be tested. The format is:
 * {
 *    number of windows: {
 *        name of window arrangement: [
 *            Array of window movements (executed in sequence)
 *            that will create the desired arrangement of format
 *            [moved window index, moved corner, target window index, target
 * corner, offset]
 *        ]
 *    }
 * }
 */
export interface ArrangementsType {
    [numWindows: number]: {[arrangementName: string]: Arrangement};
}

export type WindowPosition = {
    defaultTop: number,
    defaultLeft: number
};


/**
 * Helper class to instantiate and optionally arrange openfin windows to be
 * used by tests.
 */
export class WindowInitializer {
    private _windowPositions: WindowPosition[];
    private _windowOptions: fin.WindowOptions;

    private _arrangements: ArrangementsType;
    public get arrangements(): ArrangementsType {
        return this._arrangements;
    }

    constructor(arrangements?: ArrangementsType, windowPositions?: WindowPosition[], windowOptions?: fin.WindowOptions) {
        this._arrangements = arrangements || defaultArrangements;
        this._windowPositions = windowPositions || defaultWindowPositions;
        this._windowOptions = windowOptions || deafultWindowOptions;
    }

    /**
     * Creates and optionally arranges the given number of windows.
     * @param num Number of windows to create
     * @param arrangementName (optional) Name of the arrangement (from this.Arrangements) to arrange the windows as.
     */
    public async initWindows(num: number, arrangementName?: string): Promise<Window[]> {
        const windows: Window[] = new Array<Window>(num);

        for (let i = 0; i < num; i++) {
            windows[i] = await createChildWindow({...(this._windowPositions[i]), ...this._windowOptions});
        }

        if (arrangementName) {
            await this.arrangeWindows(windows, arrangementName);
        }

        // Slight delay to allow things to stabilize
        await delay(500);

        return windows;
    }

    /**
     * Arranges a set of pre-created windows.
     * @param windows The windows to be arranged
     * @param arrangementName Name of the arrangement (from this.Arrangements) to arrange the windows as.
     */
    public async arrangeWindows(windows: Window[], arrangementName: string): Promise<void> {
        const num = windows.length;
        if (this._arrangements.hasOwnProperty(num) && this._arrangements[num].hasOwnProperty(arrangementName)) {
            for (const moveArgs of this._arrangements[num][arrangementName]) {
                // Destruct the move args before calling it as typescript causes issues
                // otherwise.
                const [w1, c1, w2, c2, d] = moveArgs;
                await dragWindowToOtherWindow(windows[w1], c1, windows[w2], c2, d);
            }
        } else {
            throw new Error(
                `Invalid arrangment passed to arrangeWindows: ${num}:${arrangementName}. NOTE: Arrangement name must match the number of windows passed in`);
        }
    }
}

const defaultWindowPositions = [
    {defaultTop: 100, defaultLeft: 100},
    {defaultTop: 100, defaultLeft: 375},
    {defaultTop: 375, defaultLeft: 100},
    {defaultTop: 375, defaultLeft: 375},
    {defaultTop: 650, defaultLeft: 100},
    {defaultTop: 650, defaultLeft: 375},
    {defaultTop: 100, defaultLeft: 650},
    {defaultTop: 375, defaultLeft: 650},
    {defaultTop: 650, defaultLeft: 650}
];
const deafultWindowOptions = {
    autoShow: true,
    saveWindowState: false,
    defaultHeight: 250,
    defaultWidth: 250,
    url: 'http://localhost:1337/demo/popup.html',
    frame: false
};

export const defaultArrangements: ArrangementsType = {
    1: {'default': []},
    2: {
        // 0
        // 1
        'vertical': [
            [1, 'top-left', 0, 'bottom-left', {x: 10, y: 2}],
        ],
        // 0 1
        'horizontal': [
            [1, 'top-left', 0, 'top-right', {x: 2, y: 10}],
        ]
    },
    3: {
        // 0 1 2
        'line': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'bottom-left', 1, 'bottom-right', {x: 2, y: -10}],
        ],
        // 0
        //   1
        // 2
        'vertical-triangle': [
            [2, 'top-left', 0, 'bottom-left', {x: 10, y: 2}],
            [1, 'top-left', 0, 'top-right', {x: 2, y: 127}],
        ],
        // 0 1
        //  2
        'horizontal-triangle': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-left', 0, 'bottom-left', {x: 127, y: 2}],
        ]
    },
    4: {
        // 0 1
        // 2 3
        'square': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-right', 0, 'bottom-right', {x: -10, y: 2}],
            [3, 'top-left', 0, 'bottom-right', {x: 10, y: 2}],
        ]
    },
    5: {
        // 0 1
        //  2
        // 3 4
        'hourglass': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-left', 0, 'bottom-left', {x: 127, y: 2}],
            [3, 'top-right', 2, 'bottom-left', {x: 123, y: 2}],
            [4, 'top-left', 3, 'top-right', {x: 2, y: -10}],
        ]
    },
    7: {
        //  0 1
        // 2 3 4
        //  5 6
        'honeycomb': [
            [1, 'bottom-left', 0, 'bottom-right', {x: 2, y: -10}],
            [2, 'top-left', 0, 'bottom-left', {x: -127, y: 2}],
            [3, 'top-left', 2, 'top-right', {x: 2, y: 2}],
            [4, 'top-left', 3, 'top-right', {x: 2, y: 2}],
            [5, 'top-right', 3, 'bottom-left', {x: 123, y: 2}],
            [6, 'top-left', 3, 'bottom-right', {x: -120, y: 2}],
        ]
    }
};