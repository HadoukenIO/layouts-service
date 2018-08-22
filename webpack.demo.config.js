const CopyWebpackPlugin = require('copy-webpack-plugin');

const utils = require('./buildutils');

// this makes ./dist look like a valid module by slightly altering package.json's main and types entries
utils.mockDistDir();

module.exports = [
    utils.createConfig('demo', {LayoutsUI: './src/demo/LayoutsUI.ts'}, true, new CopyWebpackPlugin( [{ from: './res/demo' }]) ),
    utils.createConfig('demo', {Snappable: './src/demo/Snappable.ts'}, true)
];
