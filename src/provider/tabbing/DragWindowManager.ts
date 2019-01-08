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
    public static readonly onDragOver: Signal2<DesktopWindow, Point> = new Signal2();
    public static readonly onDragDrop: Signal0 = new Signal0();

    // tslint:disable-next-line:no-any setTimout return Type is confused by VSC
    private _hideTimeout: any;

    private _window!: Window;

    private sourceWindow: DesktopWindow|null;
    private model: DesktopModel;

    constructor(model: DesktopModel) {
        this.model = model;
        this.sourceWindow = null;
    }

    /**
     * Initializes Async Methods required by this class.
     */
    public async init(): Promise<void> {
        await this._createDragWindow();
    }

    /**
     * Shows the drag window overlay.
     */
    public showWindow(source: WindowIdentity): void {
        this.sourceWindow = this.model.getWindow(source);

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
        DragWindowManager.onDragDrop.emit();
        this._window.hide();
        clearTimeout(this._hideTimeout);
    }

    /**
     * Creates the drag overlay window.
     */
    private async _createDragWindow(): Promise<void> {
        this._window = await fin.Window.create({
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
        });

        const nativeWin = await this._window.getNativeWindow();

        nativeWin.document.body.addEventListener('dragover', (ev: DragEvent) => {
            DragWindowManager.onDragOver.emit(this.sourceWindow!, {x: ev.screenX, y: ev.screenY});
            ev.preventDefault();
            ev.stopPropagation();

            return true;
        });

        nativeWin.document.body.addEventListener('drop', (ev: DragEvent) => {
            DragWindowManager.onDragDrop.emit();
            ev.preventDefault();
            ev.stopPropagation();
            return true;
        });

        await this._window.resizeTo(screen.width, screen.height, 'top-left');
        await this._window.hide();
    }
}
