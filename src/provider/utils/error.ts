export enum ErrorMedium {
    "NOTIFICATION",
    "WINDOW"
}

/**
 * Creates an error notice in the form of a openfin window or notification.
 * @param title Title of the error
 * @param message Error message
 * @param icon Error message icon.  Default is red error cross.
 * @param showOnceKey This key is used to identify if the error has occurred.  If set, this error will only show once and never again.
 * @param medium Notification or Window
 */
export async function createErrorNotice(title: string, message: string, icon: string | null, showOnceKey: string | null, medium: ErrorMedium) {
    if (!showOnceKey || !localStorage.getItem(showOnceKey)) {
        const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
        const url = launchDir + '/errors/error.html';

        /**
         * CustomData passed to the notice
         */
        const customData = { error: message, title, icon };

        if(medium === ErrorMedium.NOTIFICATION ) {
            return new Promise<void>((resolve, reject) => {
                const errorNote = new fin.desktop.Notification({
                    url,
                    message: customData,
                    //@ts-ignore Timeout is valid and has been for a very long time: https://developer.openfin.co/jsdocs/stable/fin.desktop.Notification.html#~options
                    timeout: 500000,
                    onShow: () => {
                        if(showOnceKey) {
                            localStorage.setItem(showOnceKey, 'true');
                        }
                    },
                    onDismiss: () => { resolve(); },
                    onClose: () => { resolve(); },
                    onError: err => { reject(err); }
                });
            });
        } else {
            const uuid = 'layouts-error-' + fin.desktop.getUuid();

            const errorApp = await fin.Application.create({
                url,
                uuid,
                name: uuid,
                mainWindowOptions: {
                    icon: icon || launchDir + '/errors/error-icon.png',
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
                    experimental: { v2Api: true },
                    customData
                }
            });

            await errorApp.run();

            if(showOnceKey) {
                localStorage.setItem(showOnceKey, 'true');
            }

            return new Promise<void>(resolve => {
                errorApp.addListener('closed', () => {
                    resolve();
                });
            });
        }
    }
}