import {createWindowTest} from '../utils/createWindowTest';
import {dragSideToSide} from '../../provider/utils/dragWindowTo';
import {layoutsClientPromise} from '../utils/serviceUtils';
import {tabWindowsTogether} from '../../provider/utils/tabWindowsTogether';

describe('When calling getDockGroup, the data returned accurately represents the group state of the target window', () => {
    it('Two single undocked windows', async () => createWindowTest(async context => {
        const {windows} = context;
        const layouts = await layoutsClientPromise;

        const groups = await Promise.all(windows.map(win => layouts.snapAndDock.getDockedWindows(win.identity)));

        expect(groups).toEqual([null, null]);
    })({windowCount: 2, frame: true}));

    it('Two docked windows and a single undocked window', async () => createWindowTest(async context => {
        const {windows} = context;
        const layouts = await layoutsClientPromise;

        await dragSideToSide(windows[1], 'left', windows[0], 'right');

        const groups = await Promise.all(windows.map(win => layouts.snapAndDock.getDockedWindows(win.identity)));

        const expectedGroup = [
            windows[0].identity,
            windows[1].identity
        ];

        expect(groups).toEqual([expectedGroup, expectedGroup, null]);
    })({windowCount: 3, frame: true}));

    it('One tabgroup and one window both undocked', async () => createWindowTest(async context => {
        const {windows} = context;
        const layouts = await layoutsClientPromise;

        await tabWindowsTogether(windows[0], windows[1]);

        const groups = await Promise.all(windows.map(win => layouts.snapAndDock.getDockedWindows(win.identity)));

        expect(groups).toEqual([null, null, null]);
    })({windowCount: 3, frame: true}));

    it('One tabgroup docked to a window', async () => createWindowTest(async context => {
        const {windows} = context;
        const layouts = await layoutsClientPromise;

        await tabWindowsTogether(windows[0], windows[1]);
        await dragSideToSide(windows[2], 'left', windows[0], 'right');

        const groups = await Promise.all(windows.map(win => layouts.snapAndDock.getDockedWindows(win.identity)));

        const expectedGroup = [
            [windows[0].identity, windows[1].identity], // Tab group
            windows[2].identity
        ];

        expect(groups).toEqual([expectedGroup, expectedGroup, expectedGroup]);
    })({windowCount: 3, frame: true}));

    it('Two docked tabgroups', async () => createWindowTest(async context => {
        const {windows} = context;
        const layouts = await layoutsClientPromise;

        await tabWindowsTogether(windows[0], windows[1]);
        await tabWindowsTogether(windows[2], windows[3]);

        await dragSideToSide(windows[2], 'left', windows[0], 'right');

        const groups = await Promise.all(windows.map(win => layouts.snapAndDock.getDockedWindows(win.identity)));

        const expectedGroup = [
            [windows[0].identity, windows[1].identity],
            [windows[2].identity, windows[3].identity]
        ];

        expect(groups).toEqual([expectedGroup, expectedGroup, expectedGroup, expectedGroup]);
    })({windowCount: 4, frame: true}));
});
