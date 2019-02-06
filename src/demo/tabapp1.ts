import * as Layouts from '../client/main';

const randomColor = () => {
    return '#' + ((1 << 24) * Math.random() | 0).toString(16);
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.backgroundColor = randomColor();
});

fin.desktop.main(() => {
    Layouts.tabbing.setTabstrip({url: 'http://localhost:1337/demo/tabstrips/custom1.html', height: 62});
    Layouts.tabbing.addEventListener('tab-added', (e) => {
        console.log('TABBED: ');
    });

    //@ts-ignore
    window.layouts = Layouts;

    Layouts.tabbing.addEventListener('tab-removed', () => {
        console.log('UNTABBED: ');
    });

    // Workaround for issue with snapping/S&R integration
    Layouts.workspaces.setRestoreHandler((payload) => Promise.resolve(payload));
    Layouts.workspaces.ready();
});