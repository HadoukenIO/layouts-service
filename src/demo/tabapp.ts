import * as Layouts from '../client/main';

const randomColor = () => {
    return '#' + ((1 << 24) * Math.random() | 0).toString(16);
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.backgroundColor = randomColor();
});

fin.desktop.main(() => {
    Layouts.addEventListener('join-tab-group', () => {
        console.log('TABBED: ');
    });

    Layouts.addEventListener('leave-tab-group', () => {
        console.log('UNTABBED: ');
    });
});