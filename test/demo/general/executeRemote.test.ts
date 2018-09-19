import {test} from 'ava';

import {createChildWindow} from '../../provider/utils/createChildWindow';
import {executeJavascriptOnService} from '../utils/executeJavascriptOnService';
import {getGroupedWindows, isWindowRegistered} from '../utils/snapServiceUtils';

test('remote execute test', async t => {
    const win1 = await createChildWindow({autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200});
    const win2 = await createChildWindow({autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200});

    t.true(await isWindowRegistered(win1.identity));
    t.true(await isWindowRegistered(win2.identity));

    const group1 = await getGroupedWindows(win1.identity);
    const group2 = await getGroupedWindows(win2.identity);

    t.notDeepEqual(group1, group2);
});