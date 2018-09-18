const main = async () => {
    let provider = await fin.desktop.InterApplicationBus.Channel.create();

    provider.register('createWindow', (payload) => new Promise((res, rej) => {
        new fin.desktop.Window(payload, () => res(), rej);
    }));
}; 

main();