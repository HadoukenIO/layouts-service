const RUNTIME_VERSION = 'stable';
const URL = 'google.com';
const autoShow = false;

module.exports = (content, path) => {
    const config = JSON.parse(content.toString());
    console.log(config)
    config.runtime.version = RUNTIME_VERSION;
    config.startup_app.url = URL;
    config.startup_app.autoShow = autoShow;
    return JSON.stringify(config, null, 2);
}