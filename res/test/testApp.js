const main = async () => {
    let provider = await fin.desktop.InterApplicationBus.Channel.create('test-app-comms');

    provider.register('createWindow', (payload) => new Promise((res, rej) => {
        new fin.desktop.Window(payload, () => res(), rej);
    }));
}; 

main();