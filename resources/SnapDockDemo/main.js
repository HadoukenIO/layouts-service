const colors =
['#7B7BFF', '#A7A7A7', '#3D4059', '#D8D8D8', '#1A194D', '#B6B6B6'];
// tslint:disable-next-line
const n = parseInt(fin.desktop.Window.getCurrent().name.slice(-1), 10);
document.body.style.backgroundColor = colors[n - 1];
const h1 = document.createElement('h1');
h1.innerHTML = `Window ${n}`;
document.body.appendChild(h1);
const btn = document.createElement('button')
btn.innerText = 'Undock'
btn.onclick = () => window.Layouts.undock()
btn.style = '-webkit-app-region: no-drag'
document.body.appendChild(btn)
const explodeBtn = document.createElement('button')
explodeBtn.innerText = 'Explode'
explodeBtn.onclick = () => window.Layouts.explodeGroup()
explodeBtn.style = '-webkit-app-region: no-drag'
document.body.appendChild(explodeBtn)