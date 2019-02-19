import {App} from './App';

declare var window: Window&{app: App};

// Initialise application
window.app = new App();
