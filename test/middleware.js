

module.exports = (app) => {
    app.use('/create-manifest', (req, res) => {
        const {uuid, url, defaultTop, config, autoShow} = req.query;
        const additionalServiceProperties = config ? {config: JSON.parse(config)} : {};

        // Create manifest (based upon demo app manifest)
        const {shortcut, services, ...baseManifest} = require('../res/demo/app.json');
        const appUuid = uuid || 'save-restore-test-app-' + Math.random().toString(36).substring(2);
        const manifest = {
            ...baseManifest,
            startup_app: {
                uuid: appUuid,
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
                ...additionalServiceProperties,
                "config": {
                    "rules": [
                        {
                            "scope": {
                                "level": "application",
                                "uuid": appUuid,
                                "name": appUuid
                            },
                            "config": {
                                "enabled": true,
                                "features": {
                                    "snap": true,
                                    "dock": true,
                                    "tab": true
                                },
                                "preview": {
                                    "snap": {
                                        "activeOpacity": 0.8,
                                        "targetOpacity": 0.8
                                    },
                                    "tab": {
                                        "activeOpacity": 0.8,
                                        "targetOpacity": 0.8
                                    }
                                }
                            }
                        }
                    ]
                }

            }]
        };

        // Send response
        res.contentType('application/json');
        res.json(manifest);
    });
};
