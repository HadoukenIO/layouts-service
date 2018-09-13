import * as Layouts from '../client/main';

// Build HTML
const colors = ['#7B7BFF', '#A7A7A7', '#3D4059', '#D8D8D8', '#1A194D', '#B6B6B6'];
const n = Number.parseInt(fin.desktop.Window.getCurrent().name.slice(-1), 10);
document.body.style.backgroundColor = colors[n - 1];
const h1 = document.createElement('h1');
h1.innerHTML = `Window ${n}`;
document.body.appendChild(h1);
const btn = document.createElement('button');
btn.innerText = 'Undock Window';
btn.onclick = () => Layouts.undockWindow();
// tslint:disable-next-line:no-any
(btn.style as any) = '-webkit-app-region: no-drag';
document.body.appendChild(btn);
const explodeBtn = document.createElement('button');
explodeBtn.innerText = 'Undock Group';
explodeBtn.onclick = () => Layouts.undockGroup();
// tslint:disable-next-line:no-any
(explodeBtn.style as any) = '-webkit-app-region: no-drag';
document.body.appendChild(explodeBtn);

// Add listeners
Layouts.addEventListener('join-snap-group', () => {
    console.log('Joined group');
});
Layouts.addEventListener('leave-snap-group', () => {
    console.log('Left group');
});

// Allow window to de-register from layouts at a time of its choosing
export async function deregister(identity = fin.desktop.Window.getCurrent()) {
    return Layouts.deregister(identity);
}

export async function undockWindow(identity = fin.desktop.Window.getCurrent()) {
    return Layouts.undockWindow(identity);
}

export async function undockGroup(identity = fin.desktop.Window.getCurrent()) {
    return Layouts.undockGroup(identity);
}
