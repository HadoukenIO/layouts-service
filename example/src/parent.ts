import {deregister} from 'openfin-layouts';

const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
const url = `${launchDir}/frameless-window.html`;

fin.desktop.main(() => {
  for (let i = 0; i < 6; i++) {
    const x = new fin.desktop.Window(
        {
          url,
          autoShow: true,
          defaultHeight: 300,
          defaultWidth: 300,
          defaultLeft: 320 * (i % 3),
          defaultTop: i > 2 ? 400 : 50,
          saveWindowState: false,
          frame: i % 2 === 0,
          name: 'win' + i
        },
        console.log, console.error);
  }

  const btn = document.createElement('button');
  btn.id = 'button';
  btn.innerText = 'Deregister Me';
  btn.onclick = async () => {
    btn.disabled = true;
    await deregister();
    btn.remove();
    const p = document.createElement('p');
    p.innerText = `I don't snap any more`;
    p.style.color = '#ffffff';
    document.body.appendChild(p);
  };
  document.body.appendChild(btn);
});