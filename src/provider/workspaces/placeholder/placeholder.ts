document.addEventListener('DOMContentLoaded', () => {
    // Add close button to placeholder.
    setTimeout(() => {
        const div = document.createElement('div');
        div.id = 'window-button-exit';
        document.body.appendChild(div);
        div.addEventListener('click', () => {
            window.close();
        });
    }, 40000);
});