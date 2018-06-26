const layoutServiceUuid = 'Layouts';
const ofWindow = fin.desktop.Window.getCurrent();

// tslint:disable-next-line:no-any
(window as any).undock = () => {};
// tslint:disable-next-line:no-any
(window as any).client = {};

(async () => {
    const client = await fin.desktop.Service.connect({uuid: layoutServiceUuid, name: layoutServiceUuid});

    // tslint:disable-next-line:no-any
    (window as any).client = client;

    console.log(await client.dispatch('foo', 'bar'));

    // tslint:disable-next-line:no-any
    (window as any).undock = () => client.dispatch('undock', {uuid: ofWindow.uuid, name: ofWindow.name});
})();
