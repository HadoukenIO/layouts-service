module.exports = (RUNTIME_VERSION, URL, autoShow) => (content) => {
    const config = JSON.parse(content.toString());
    config.runtime.version = RUNTIME_VERSION;
    config.startup_app.url = URL;
    config.startup_app.autoShow = autoShow;
    return JSON.stringify(config, null, 2);
}