const url = `${launchDir}/demo-window.html`;
const openChild = (name) => {
    const win = fin.Window.create({
        url,
        autoShow: true,
        defaultHeight: 250 + 50*i,
        defaultWidth: 250 + 50*i,
        defaultLeft: 320*(i%3),
        defaultTop: i > 2 ? 400 : 50,
        saveWindowState: false,

        name
    });
    return win;
}

const openApp = async () => {
    const appUrl = `${launchDir}/app2.json`;
    console.log('appurl', appUrl);
    fin.desktop.Application.createFromManifest(appUrl, a=>a.run());
    // v2 api broken for createfromman / run
    // const app = await fin.Application.createFromManifest(appUrl);
    // app.run();
}

const forgetWindows = [];
const forgetMe = (identity) => {
    forgetWindows.push(identity);
};
const removeForgetWins = (window) => {
    return !forgetWindows.some(w => w.name === window.name)
}
window.forgetMe = forgetMe;

const onAppRes = async (layoutApp) => {
    console.log('Apprestore called:', layoutApp)
    const ofApp = await fin.Application.getCurrent();
    const openWindows = await ofApp.getChildWindows();
    const openAndPosition = layoutApp.childWindows.map(async win => {
        if(!openWindows.some(w => w.identity.name === win.name)) {
            const ofWin = await openChild(win.name);
            await ofWin.setBounds(win).catch(e => console.log('Setbounds error:', e));
        } else {
            const ofWin = await fin.Window.wrap(win);
            await ofWin.leaveGroup();
            await ofWin.setBounds(win);
        }
    });
    await Promise.all(openAndPosition);
    return layoutApp;
}

window.LayoutsManager.serviceReady().then(() => {
    window.LayoutsManager.onWillSaveLayout(layoutApp => {
        layoutApp.childWindows = layoutApp.childWindows.filter(removeForgetWins);
        return layoutApp
    });
    window.LayoutsManager.onAppRestore(onAppRes);
    window.LayoutsManager.ready();
});