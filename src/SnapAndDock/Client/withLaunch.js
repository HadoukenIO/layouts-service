const Mousetrap = require('mousetrap')

window.SnapAndDock = (function() {
  async function launchAndConnect() {
    let client;
    try {
      client = await fin.desktop.Service.connect(
          {uuid: 'Layouts-Manager', name: 'Layouts-Manager', wait: false})
    } catch (err) {
      if (location.host === 'cdn.openfin.co') {
        console.error('Not for production use')
      }
      const manifestUrl = `http://localhost:1337/SnapDockService/app.json`;
      console.log(manifestUrl)
      await (new Promise(
                 (s, f) => fin.desktop.Application.createFromManifest(
                     manifestUrl, app => s(app.run()), f)))
          .catch(console.error)
      client = await fin.desktop.Service.connect(
          {uuid: 'Layouts-Manager', name: 'Layouts-Manager'})
    }
    return client
  }
  const ofWin = fin.desktop.Window.getCurrent();
  const id = {uuid: ofWin.uuid, name: ofWin.name}

  const makeClient = (() => {
    let client;
    return () => {
      if (client) {
        return client
      } else {
        client = launchAndConnect();
        return client
      }
    }
  })()

  makeClient().then(plugin => Mousetrap.bind('command+shift+u', e => {
    plugin.dispatch('undock', id);
  }))

  return {
    undock: async function(identity = id) {
      const client = await makeClient();
      return client.dispatch('undock', identity)
    }, deregister: async function(identity = id) {
      const client = await makeClient();
      return client.dispatch('deregister', identity)
    }
  }
})()