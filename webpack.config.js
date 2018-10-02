const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path')

const utils = require('./buildutils');

const outputDir = path.resolve(__dirname, './build');

module.exports = [
    utils.createConfig(`${outputDir}/provider`, './staging/provider/main.js', false, 
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
                const newConfig = utils.prepConfig(config, 'http://localhost:1337/provider/provider.html');
                return JSON.stringify(newConfig, null, 4);
            }
            }]
    )),
    utils.createConfig(`${outputDir}/provider`, {tabStrip: './src/provider/tabbing/tabstrip/main.ts'}, false),
    utils.createConfig(`${outputDir}/demo`, {LayoutsUI: './src/demo/LayoutsUI.ts'}, true, new CopyWebpackPlugin( [{ from: './res/demo' }]) ),
    utils.createConfig(`${outputDir}/demo`, {Snappable: './src/demo/Snappable.ts'}, true),
    utils.createConfig(`${outputDir}/demo`, {deregisteredApp: './src/demo/deregisteredApp.ts'}, true),
    utils.createConfig(`${outputDir}/demo`, {normalApp: './src/demo/normalApp.ts'}, true),
    utils.createConfig(`${outputDir}/demo`, {tabapp1: './src/demo/tabapp1.ts'}, true),
    utils.createConfig(`${outputDir}/demo`, {tabapp2: './src/demo/tabapp2.ts'}, true)
];
