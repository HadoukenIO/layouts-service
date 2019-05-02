export async function createErrorBox(title: string, message: string) {
    const uuid = 'layouts-error-' + fin.desktop.getUuid();
    const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
    const errorApp = await fin.Application.create({
        url: launchDir + '/errors/error.html',
        uuid,
        name: uuid,
        mainWindowOptions: {
            icon: launchDir + '/errors/error-icon.png',
            defaultHeight: 150,  // size increased later to fully fit error message
            defaultWidth: 570,
            defaultCentered: true,
            saveWindowState: false,
            showTaskbarIcon: false,
            autoShow: false,  // shown later after resizing is done
            alwaysOnTop: true,
            resizable: false,
            contextMenu: false,
            minimizable: false,
            maximizable: false,
            nonPersistent: true,
            experimental: {v2Api: true},
            customData: {error: message, title}
        }
    });
    await errorApp.run();

    return new Promise(resolve => {
        errorApp.addListener('closed', () => {
            resolve();
        });
    });
}
