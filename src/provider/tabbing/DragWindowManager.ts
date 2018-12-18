import {Window} from 'hadouken-js-adapter';

import {WindowIdentity} from '../../client/types';

const DRAG_WINDOW_URL = (() => {
    let providerLocation = window.location.href;

    if (providerLocation.indexOf('http://localhost') === 0) {
        // Work-around for fake provider used within test runner
        providerLocation = providerLocation.replace('/test', '/provider');
    }

    // Locate the default tabstrip HTML page, relative to the location of the provider
    return providerLocation.replace('provider.html', 'tabbing/drag.html');
})();

/**
 * Handles the Drag Window which appears when API drag and drop is initialized.
 */
export class DragWindowManager {
    // Multiple definitions of setTimeout/clearTimeout, and not possible to point TSC at the correct (non-Node) definition
    private _hideTimeout: number|NodeJS.Timer;

    private _window!: Window;

    constructor() {
        this._hideTimeout = -1;
        this._createDragWindow();
    }

    /**
     * Shows the drag window overlay.
     */
    public showWindow(source: WindowIdentity): void {
        this._window.show();
        this._window.focus();

        // Bring source window in front of invisible window
        fin.Window.wrapSync(source).focus();

        this._hideTimeout = setTimeout(() => {
            this._window.hide();
        }, 15000);
    }

    /**
     * Hides the drag window overlay.
     */
    public hideWindow(): void {
        this._window.hide();

        clearTimeout(this._hideTimeout as number);
        this._hideTimeout = -1;
    }

    /**
     * Creates the drag overlay window.
     */
    private async _createDragWindow(): Promise<void> {
        this._window = await fin.Window.create({
            name: 'TabbingDragWindow',
            url: DRAG_WINDOW_URL,
            defaultHeight: 1,
            defaultWidth: 1,
            defaultLeft: 0,
            defaultTop: 0,
            saveWindowState: false,
            autoShow: true,
            opacity: 0.01,
            frame: false,
            waitForPageLoad: false,
            alwaysOnTop: false,
            showTaskbarIcon: false,
            smallWindow: true
        });

        await this._window.resizeTo(screen.width, screen.height, 'top-left');
        await this._window.hide();
    }
}
