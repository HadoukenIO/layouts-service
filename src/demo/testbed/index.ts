import * as Layouts from '../../client/main';

import {App} from './App';

let var window: Window&{
    app: App;
    Layouts: typeof Layouts;
};

// Initialise application
window.app = new App();

// Add client API to window object for debugging
window.Layouts = Layouts;
