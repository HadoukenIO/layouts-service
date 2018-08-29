// this function simply copies/modifies root package.json into the 
// dist dir with the correct paths
// this is only useful for ./src/demo
// the copy of the file at dist/package.json is npm-ignored
function mockDistDir() {

    fs = require('fs');
    pkg = require('./package.json');

    // just remove "dist/"" from paths
    pkg.main = pkg.main.replace('dist/', '');
    pkg.types = pkg.types.replace('dist/', '');

    // write the modified json into the dist folder
    fs.writeFile('./dist/package.json', JSON.stringify(pkg, null, 4), (err) => {
        if (err) throw err;
    });
}

// shared function to create a webpack config for an entry point
function createConfig(outPath, entryPoint, isLibrary, ...plugins) {
    const config = {
        entry: entryPoint,
        output: {
            path: outPath,
            filename: '[name]-bundle.js'
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader'
                }
            ]
        },
        plugins: []
    };

    if (isLibrary) {
        config.output.library = '[name]';
        config.output.libraryTarget = 'window';
    }
    if (plugins && plugins.length) {
        config.plugins.push.apply(config.plugins, plugins);
    }

    return config;
}


// allows for overriding the startup_app.url based on env vars
function prepConfig(config, defaultUrl) {
    const newConf = Object.assign({}, config);
    if (typeof process.env.GIT_SHORT_SHA != 'undefined' && process.env.GIT_SHORT_SHA != "" ) {
        newConf.startup_app.url = 'https://cdn.openfin.co/services/openfin/layouts/' + process.env.GIT_SHORT_SHA + '/provider.html';
        newConf.startup_app.autoShow = false;
    } else if (typeof process.env.CDN_ROOT_URL != 'undefined' && process.env.CDN_ROOT_URL != "" ) {
        newConf.startup_app.url = process.env.CDN_ROOT_URL + '/provider.html';
    } else if (typeof defaultUrl != 'undefined' && defaultUrl != "" ) {
        newConf.startup_app.url = defaultUrl;
    }
    return newConf;
}


module.exports = {
    mockDistDir: mockDistDir,
    prepConfig: prepConfig,
    createConfig: createConfig
};