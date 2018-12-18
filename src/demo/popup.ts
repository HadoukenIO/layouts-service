import * as Layouts from '../client/main';
import {deregister, undockGroup, undockWindow} from '../client/main';

// Used by 'popup-*' variants within integration tests
export {deregister};

document.addEventListener('DOMContentLoaded', () => {
    // Get window index
    const id = /\d+/.exec(fin.Window.getCurrentSync().identity.name!);
    const n = id ? Number.parseInt(id.toString(), 10) : 0;

    // Set background color
    const colors = ['#7B7BFF', '#A7A7A7', '#3D4059', '#D8D8D8', '#1A194D', '#B6B6B6'];
    document.body.style.backgroundColor = colors[n - 1];

    // Set title
    const h1 = document.getElementById('title')!;
    document.title = h1.innerHTML = `Window ${n}`;

    // Add DOM listeners
    document.getElementById('undockWindow')!.addEventListener('click', () => {
        undockWindow();
    });
    document.getElementById('undockGroup')!.addEventListener('click', () => {
        undockGroup();
    });
});

// Expose layouts API on window for debugging/demoing
(window as Window & {layouts: typeof Layouts}).layouts = Layouts;
