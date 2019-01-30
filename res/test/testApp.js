const main = async () => {
    fin.InterApplicationBus.Channel.connect('of-layouts-service-v1').then(client => {
        client.dispatch('deregister', fin.Window.me);
        client.register('savingLayout', () => {});
        client.register('restoreApp', (a) => a);
    });
    


    let provider = await fin.desktop.InterApplicationBus.Channel.create('test-app-comms');

    provider.register('createWindow', (payload) => new Promise((res, rej) => {
        new fin.desktop.Window(payload, () => res(), rej);
    }));
}; 

main();
