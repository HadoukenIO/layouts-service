

exports.default = (app) => {
    app.use('/create-manifest', (req, res) => {
        const {uuid, url, defaultTop, config, autoShow} = req.query;
        const additionalServiceProperties = config ? {config: JSON.parse(config)} : {};

        // Create manifest (based upon demo app manifest)
        const {shortcut, services, ...baseManifest} = require('../res/demo/app.json');
        const manifest = {
            ...baseManifest,
            startup_app: {
                uuid: uuid || 'save-restore-test-app-' + Math.random().toString(36).substring(2),
                url: url || 'http://localhost:1337/test/saveRestoreTestingApp.html?deregistered=false',
                autoShow: autoShow || true,
                saveWindowState: false,
                defaultTop: defaultTop ? JSON.parse(defaultTop): 100,
                defaultLeft: 100,
                defaultHeight: 225,
                defaultWidth: 225
            },
            services: [{
                name: 'layouts',
                manifestUrl: 'http://localhost:1337/test/provider.json',
                ...additionalServiceProperties
            }]
        };

        // Send response
        res.contentType('application/json');
        res.json(manifest);
    });
};
