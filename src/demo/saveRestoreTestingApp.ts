import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import * as Layouts from '../client/main';

export {createChild, onAppRes} from './normalApp';

const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

// Allow the test app to create Test Children
fin.desktop.main(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const deregistered = urlParams.get('deregistered');

    if (deregistered && JSON.parse(deregistered)) {
        Layouts.deregister();

        const testingAppTitle = document.getElementById('testingAppTitle');
        testingAppTitle!.innerText = 'Deregistered Demo App';

        const testingAppH1 = document.getElementById('testingAppH1');
        testingAppH1!.innerText = 'Deregistered App - Main Window';

        const testingAppP = document.getElementById('testingAppP');
        testingAppP!.innerText = 'Can\'t Snap & Dock, Tab, and Save & Restore';
    }

    async function createTestChild(options: fin.WindowOptions): Promise<_Window> {
        return await fin.Window.create({
            url: options.url || `${launchDir}/demo-window.html`,
            autoShow: true,
            defaultHeight: options.defaultHeight,
            defaultWidth: options.defaultWidth,
            defaultLeft: options.defaultLeft,
            defaultTop: options.defaultTop,
            saveWindowState: options.saveWindowState,
            frame: options.frame,
            name: options.name
        });
    }

    const thisWindow = fin.desktop.Window.getCurrent();
    const provider = await fin.InterApplicationBus.Channel.create(`test-comms-${thisWindow.uuid}`);
    provider.register('createWindow', async (options: fin.WindowOptions) => await createTestChild(options));
});
