const main = async () => {
    fin.desktop.InterApplicationBus.Channel.connect('of-layouts-service-v1').then(client => {
        client.dispatch('DEREGISTER');
        client.register('SET-SAVE-HANDLER', () => {});
        client.register('SET-RESTORE-HANDLER', (a) => a);
    });
    
    let provider = await fin.desktop.InterApplicationBus.Channel.create('test-app-comms');

    provider.register('createWindow', (payload) => new Promise((res, rej) => {
        new fin.desktop.Window(payload, () => res(), rej);
    }));
}; 

main();
