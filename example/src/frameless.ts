import {undock} from 'openfin-layouts';

const btn = document.createElement('button');
btn.innerText = 'Undock';
btn.onclick = () => undock();
Object.assign(btn.style, {['-webkit-app-region']: 'no-drag'});
document.body.appendChild(btn);