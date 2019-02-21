const fs = require('fs');
const path = require('path');

const {PORT, CDN_LOCATION} = require('./config');

/**
 * Creates express-compatible middleware function to generate custom application manifests.
 * 
 * Differs from createAppJsonMiddleware (defined in server.js), as this spawns custom demo windows, rather than 
 * re-writing existing demo/provider manifests.
 */
function createCustomManifestMiddleware() {
    return async (req, res, next) => {
        const defaultConfig = await readJsonFile(path.resolve('res/demo/app.json')).catch(next);
        const {uuid, url, frame, defaultWidth, defaultHeight, realmName, enableMesh, runtime, useService, defaultCentered, defaultLeft, defaultTop, provider, config} = {
            uuid: `demo-app-${Math.random().toString(36).substr(2, 4)}`,
            runtime: defaultConfig.runtime.version,
            provider: 'local',
            url: `http://localhost:${PORT}/demo/testbed/index.html`,
            config: null,
            ...req.query,
            defaultCentered: req.query.defaultCentered === 'true',
            defaultLeft: parseInt(req.query.defaultLeft) || 860,
            defaultTop: parseInt(req.query.defaultTop) || 605,
            defaultWidth: parseInt(req.query.defaultWidth) || 860,
            defaultHeight: parseInt(req.query.defaultHeight) || 605,
            frame: req.query.frame !== 'false',
            enableMesh: req.query.enableMesh !== 'false',
            useService: req.query.useService !== 'false'
        };

        const manifest = {
            startup_app: {
                uuid,
                name: uuid,
                url,
                frame,
                autoShow: true,
                saveWindowState: false,
                defaultCentered,
                defaultLeft,
                defaultTop,
                defaultWidth,
                defaultHeight
            },
            runtime: {
                arguments: "--v=1" + (realmName ? ` --security-realm=${realmName}${enableMesh ? ' --enable-mesh' : ''}` : ''),
                version: runtime
            }
        };
        if (useService) {
            const service = {name: 'layouts'};
            if (provider !== 'default') {
                service.manifestUrl = getProviderUrl(provider);
            }
            if (config) {
                service.config = JSON.parse(config);
            }
            manifest.services = [service];
        }

        // Return modified JSON to client
        res.header('Content-Type', 'application/json; charset=utf-8');
        res.send(JSON.stringify(manifest, null, 4));
    };
}

/**
 * Returns the URL of the manifest file for the requested version of the service.
 * 
 * @param {string} version Version number of the service, or a channel
 * @param {string} manifestUrl The URL that was set in the application manifest (if any). Any querystring arguments will be persisted, but the rest of the URL will be ignored.
 */
function readJsonFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve('res', filePath), 'utf8', (error, data) => {
            if (error) {
                reject(error);
            } else {
                try {
                    const config = JSON.parse(data);

                    if (config) {
                        resolve(config);
                    } else {
                        throw new Error(`No data found in ${filePath}`);
                    }
                } catch(e) {
                    reject(e);
                }
            }
        });
    });
}

/**
 * Returns the URL of the manifest file for the requested version of the service.
 * 
 * @param {string} version Version number of the service, or a channel
 * @param {string} manifestUrl The URL that was set in the application manifest (if any). Any querystring arguments will be persisted, but the rest of the URL will be ignored.
 */
function getProviderUrl(version, manifestUrl) {
    const index = manifestUrl && manifestUrl.indexOf("?");
    const query = index >= 0 ? manifestUrl.substr(index) : "";

    if (version === 'local') {
        // Provider is running locally
        return `http://localhost:${PORT}/provider/app.json${query}`;
    } else if (version === 'stable') {
        // Use the latest stable version
        return `${CDN_LOCATION}/app.json${query}`;
    } else if (version === 'staging') {
        // Use the latest staging build
        return `${CDN_LOCATION}/app.staging.json${query}`;
    } else if (/\d+\.\d+\.\d+/.test(version)) {
        // Use a specific public release of the service
        return `${CDN_LOCATION}/${version}/app.json${query}`;
    } else if (version.indexOf('://') > 0) {
        // Looks like an absolute URL to an app.json file
        return version;
    } else {
        throw new Error(`Not a valid version number or channel: ${version}`);
    }
}

module.exports = {createCustomManifestMiddleware, getProviderUrl, readJsonFile};
