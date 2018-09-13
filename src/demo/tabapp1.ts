import * as Layouts from '../client/main';
const randomColor = () => {
    return '#' + ((1 << 24) * Math.random() | 0).toString(16);
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.backgroundColor = randomColor();
});

fin.desktop.main(() => {
    // tslint:disable-next-line:no-any
    Layouts.setTabClient("http://localhost:1337/demo/tabbing/UI/UI1.html", { height: 62 } as any);
    Layouts.addEventListener('join-tab-group', () => {
        console.log('TABBED: ');
    });

    Layouts.addEventListener('leave-tab-group', () => {
        console.log('UNTABBED: ');
    });

    // Workaround for issue with snapping/S&R integration
    Layouts.onAppRestore((payload) => Promise.resolve(payload));
    Layouts.ready();
    
});