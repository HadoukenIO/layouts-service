const path = require("path");
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
    createConfig('provider', {tabStrip: './src/provider/tabbing/tabstrip/Tabstrip.ts'}, false, new CopyWebpackPlugin([{ from: './res/provider/tabbing/tabstrip' }])),
    createConfig('provider', {tabs: './src/provider/tabbing/index.ts'}, false, new CopyWebpackPlugin([{ from: './res/provider/tabbing' }])),
    createConfig('client', {tabs: './src/client/main.ts'}, true, new CopyWebpackPlugin([{ from: './res/demo', to: '../demo' }]))
];
