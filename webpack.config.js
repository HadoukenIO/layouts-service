const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

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

module.exports = [
    createConfig('tabset', './src/provider/tabbing/tabstrip/Tabstrip.ts', false, new CopyWebpackPlugin([{ from: './res/provider/tabbing/tabstrip' }])),
    createConfig('tabprovider', './src/provider/tabbing/index.ts', false, new CopyWebpackPlugin([{ from: './res/provider/tabbing' }])),
    createConfig('tabclient', ['./src/client/AppApi.ts', './src/client/SaveAndRestoreApi.ts', './src/client/TabbingApi.ts'], true, new CopyWebpackPlugin([{ from: './res/demo', to: '../demo' }]))
];
