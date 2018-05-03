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
  const x = new fin.desktop.Window(
      {
        url: `${launchDir}/deregistered.html`,
        autoShow: true,
        defaultHeight: 300,
        defaultWidth: 300,
        saveWindowState: false,
        name: 'deregistered-win'
      },
      console.log, console.error);
});