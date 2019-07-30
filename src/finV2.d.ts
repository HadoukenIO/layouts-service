import {Fin, System} from 'hadouken-js-adapter';
import _WindowModule from 'hadouken-js-adapter/out/types/src/api/window/window';
import InterApplicationBus from 'hadouken-js-adapter/out/types/src/api/interappbus/interappbus';
import _NotificationModule from 'hadouken-js-adapter/out/types/src/api/notification/notification';
import Clipboard from 'hadouken-js-adapter/out/types/src/api/clipboard/clipboard';
import {ExternalApplication} from 'hadouken-js-adapter/out/types/src/api/external-application/external-application';
import _FrameModule from 'hadouken-js-adapter/out/types/src/api/frame/frame';
import GlobalHotkey from 'hadouken-js-adapter/out/types/src/api/global-hotkey';
import ApplicationModule from 'hadouken-js-adapter/out/types/src/api/application/application';

// Augments the globally declared fin object to include V2 types
declare global {
    namespace fin {
        const System: System;
        const Window: _WindowModule;
        const Application: ApplicationModule;
        const InterApplicationBus: InterApplicationBus;
        const Notification: _NotificationModule;
        const Clipboard: Clipboard;
        const ExternalApplication: ExternalApplication;
        const Frame: _FrameModule;
        const GlobalHotkey: GlobalHotkey;
    }
}
