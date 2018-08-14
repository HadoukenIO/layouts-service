const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const outputDir = path.resolve(__dirname, './build');

function createConfig(component, entryPoint, isLibrary, ...plugins) {
    const config = {
        entry: entryPoint,
        output: {
            path: outputDir + '/' + component,
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

function prepConfig(config) {
    const newConf = Object.assign({}, config);
    if (typeof process.env.GIT_SHORT_SHA != 'undefined' && process.env.GIT_SHORT_SHA != "" ) {
        newConf.startup_app.url = 'https://cdn.openfin.co/services/openfin/layouts/' + process.env.GIT_SHORT_SHA + '/provider.html';
        newConf.startup_app.autoShow = false;
    } else if (typeof process.env.CDN_ROOT_URL != 'undefined' && process.env.CDN_ROOT_URL != "" ) {
        newConf.startup_app.url = process.env.CDN_ROOT_URL + '/provider.html';
    } else {
        newConf.startup_app.url = 'http://localhost:1337/provider/provider.html';
    }
    return newConf;
}

module.exports = [
    createConfig('client', './src/client/main.ts', false),
    createConfig('provider', './src/provider/main.ts', false, 
        new CopyWebpackPlugin([{ from: './res/provider/provider.html' }]),
        new CopyWebpackPlugin([{ from: './res/provider/tabbing/', to: './tabbing' }]),
        new CopyWebpackPlugin(
        [{
            // Provider temporarily requires an extra plugin to override index.html within provider app.json
            // Will be removed once the RVM supports relative paths within app.json files
            from: 'res/provider/app.json',
            to: '.',
            transform: (content) => {
                const config = JSON.parse(content);
                const newConfig = prepConfig(config);
                return JSON.stringify(newConfig, null, 4);
            }
        }]
    )),
    createConfig('provider', {tabStrip: './src/provider/tabbing/tabstrip/TabStrip.ts'}, false),
    createConfig('demo', {LayoutsUI: './src/demo/LayoutsUI.ts'}, true, new CopyWebpackPlugin( [{ from: './res/demo' }]) ),
    createConfig('demo', {Snappable: './src/demo/Snappable.ts'}, true)
];
