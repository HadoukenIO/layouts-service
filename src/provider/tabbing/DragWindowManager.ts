import {Window} from 'hadouken-js-adapter';
import {Point} from 'hadouken-js-adapter/out/types/src/api/system/point';
import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';

import {WindowIdentity} from '../../client/types';
import {DesktopModel} from '../model/DesktopModel';
import {DesktopWindow} from '../model/DesktopWindow';
import {Signal0, Signal2} from '../Signal';

/**
 * Handles the Drag Window which appears when API drag and drop is initialized.
 */
export class DragWindowManager {
    /**
     * Fires when a tab is in process of being dragged around over the dragWindow.  This will let us know which window + X/Y its position.
     *
     * Arguments: (window: DesktopWindow, position: Point)
     */
    public static readonly onDragOver: Signal2<DesktopWindow, Point> = new Signal2();

    /**
     * Fires when a tab has been dropped on the drag window, indicating an end to the drag/drop operation.
     *
     * Arguments: None.
     */
    public static readonly onDragDrop: Signal0 = new Signal0();

    // Multiple definitions of setTimeout/clearTimeout, and not possible to point TSC at the correct (non-Node) definition.
    // Usecase: failsafe for the drag window overlay should somehow it not close, the user would be "locked out" of the desktop.
    private _hideTimeout: number|NodeJS.Timer;

    private _window!: fin.OpenFinWindow;

    private _sourceWindow: DesktopWindow|null;
    private _model: DesktopModel;

    constructor(model: DesktopModel) {
        this._model = model;
        this._sourceWindow = null;
        this._hideTimeout = -1;
        this.createDragWindow();
    }

    /**
     * Shows the drag window overlay.
     */
    public showWindow(source: WindowIdentity): void {
        this._sourceWindow = this._model.getWindow(source);

        this._window.show();
        this._window.focus();

        this.resetHideTimer();
    }

    /**
     * Hides the drag window overlay.
     */
    public hideWindow(): void {
        DragWindowManager.onDragDrop.emit();
        this._window.hide();

        clearTimeout(this._hideTimeout as number);
        this._hideTimeout = -1;
    }

    private resetHideTimer(): void {
        clearTimeout(this._hideTimeout as number);
        this._hideTimeout = -1;

        this._hideTimeout = setTimeout(() => {
            this._window.hide();
        }, 30000);
    }

    /**
     * Creates the drag overlay window.
     */
    private async createDragWindow(): Promise<void> {
        await new Promise(resolve => {
            this._window = new fin.desktop.Window(
                {
                    name: 'TabbingDragWindow',
                    url: 'about:blank',
                    defaultHeight: 1,
                    defaultWidth: 1,
                    defaultLeft: 0,
                    defaultTop: 0,
                    saveWindowState: false,
                    autoShow: true,
                    opacity: 0.01,
                    frame: false,
                    waitForPageLoad: false,
                    alwaysOnTop: true,
                    showTaskbarIcon: false,
                    smallWindow: true
                },
                () => {
                    resolve();
                });
        });

        const nativeWin = await this._window.getNativeWindow();

        nativeWin.document.body.addEventListener('dragover', (ev: DragEvent) => {
            DragWindowManager.onDragOver.emit(this._sourceWindow!, {x: ev.screenX, y: ev.screenY});
            this.resetHideTimer();

            ev.preventDefault();
            ev.stopPropagation();

            return true;
        });

        nativeWin.document.body.addEventListener('drop', (ev: DragEvent) => {
            DragWindowManager.onDragDrop.emit();
            this.hideWindow();

            ev.preventDefault();
            ev.stopPropagation();
            return true;
        });

        await this._window.resizeTo(screen.width, screen.height, 'top-left');
        await this._window.hide();
    }
}
