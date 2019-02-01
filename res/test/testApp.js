const main = async () => {
    fin.InterApplicationBus.Channel.connect('of-layouts-service-v1').then(client => {
        client.dispatch('DEREGISTER', fin.Window.me);
        client.register('SET-SAVE-HANDLER', () => {});
        client.register('SET-RESTORE-HANDLER', (a) => a);
    });
    
    let provider = await fin.InterApplicationBus.Channel.create('test-app-comms');

    provider.register('createWindow', (payload) => new Promise((res, rej) => {
        new fin.desktop.Window(payload, () => res(), rej);
    }));
}; 

main();
