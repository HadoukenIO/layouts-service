import {undock} from 'openfin-layouts';

const colors =
    ['#7B7BFF', '#A7A7A7', '#3D4059', '#D8D8D8', '#1A194D', '#B6B6B6'];
// tslint:disable-next-line
const n = parseInt(fin.desktop.Window.getCurrent().name.slice(-1), 10);
document.body.style.backgroundColor = colors[n];
const btn = document.createElement('button');
btn.innerText = 'Undock';
btn.onclick = () => undock();
Object.assign(btn.style, {['-webkit-app-region']: 'no-drag'});
document.body.appendChild(btn);