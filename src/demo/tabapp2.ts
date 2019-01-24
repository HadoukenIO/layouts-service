import * as Layouts from '../client/main';

const randomColor = () => {
    return '#' + ((1 << 24) * Math.random() | 0).toString(16);
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.backgroundColor = randomColor();
});

fin.desktop.main(() => {
    Layouts.setTabstrip({url: 'http://localhost:1337/demo/tabstrips/custom2.html', height: 62});
    Layouts.addEventListener('join-tab-group', () => {
        console.log('TABBED: ');
    });

    Layouts.addEventListener('leave-tab-group', () => {
        console.log('UNTABBED: ');
    });

    // Workaround for issue with snapping/S&R integration
    Layouts.setRestoreHandler((payload) => Promise.resolve(payload));
    Layouts.ready();
});