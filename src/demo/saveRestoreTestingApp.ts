import {Identity} from 'hadouken-js-adapter';

import {deregister} from '../client/main';

export {createChild, onAppRes} from './normalApp';

const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));

async function createChildAppFromManifest(manifest: string): Promise<Identity> {
    const app = await fin.Application.createFromManifest(manifest);
    await app.run();
    return app.identity;
}

async function createChildAppFromOptions(options: fin.ApplicationOptions): Promise<Identity> {
    const app = await fin.Application.create(options);
    await app.run();
    return app.identity;
}

async function createChildWindow(options: fin.WindowOptions): Promise<Identity> {
    const window = await fin.Window.create({
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

    return window.identity;
}

// Allow the test app to create Test Children
fin.desktop.main(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const deregistered = urlParams.get('deregistered');

    if (deregistered && JSON.parse(deregistered)) {
        deregister();

        const testingAppTitle = document.getElementById('testingAppTitle');
        testingAppTitle!.innerText = 'Deregistered Demo App';

        const testingAppH1 = document.getElementById('testingAppH1');
        testingAppH1!.innerText = 'Deregistered App - Main Window';

        const testingAppP = document.getElementById('testingAppP');
        testingAppP!.innerText = 'Can\'t Snap & Dock, Tab, and Save & Restore';
    }

    const channel = await fin.InterApplicationBus.Channel.create(`test-comms-${fin.Application.me.uuid}`);
    channel.register('createAppFromManifest', async (manifest: string) => await createChildAppFromManifest(manifest));
    channel.register('createAppFromOptions', async (options: fin.ApplicationOptions) => await createChildAppFromOptions(options));
    channel.register('createWindow', async (options: fin.WindowOptions) => await createChildWindow(options));
});
