import {deregister} from 'openfin-layouts';

const launchDir = location.href.slice(0, location.href.lastIndexOf('/'));
const url = `${launchDir}/frameless-window.html`;

fin.desktop.main(async () => {
  for (let i = 0; i < 6; i++) {
    const x = new fin.desktop.Window(
        {
          url,
          autoShow: true,
          defaultHeight: i > 2 ? 275 : 200,
          defaultWidth: i > 4 ? 400 : 300,
          defaultLeft: 350 * (i % 3) + 25,
          defaultTop: i > 2 ? 300 : 50,
          saveWindowState: false,
          frame: false,
          name: 'win' + i
        },
        console.log, console.error);
  }

  const p = document.createElement('p');
  p.innerText = `I don't snap!`;
  p.style.color = '#ffffff';
  document.body.appendChild(p);
  await deregister();
  // const btn = document.createElement('button');
  // btn.id = 'button';
  // btn.innerText = 'Deregister Me';
  // btn.onclick = async () => {
  //   btn.disabled = true;
  //   try {
  //     await deregister();
  //   } catch (error) {
  //     console.log(error);
  //   }
  //   btn.remove();
  //   const p = document.createElement('p');
  //   p.innerText = `I don't snap any more`;
  //   p.style.color = '#ffffff';
  //   document.body.appendChild(p);
  // };
  // document.body.appendChild(btn);
});