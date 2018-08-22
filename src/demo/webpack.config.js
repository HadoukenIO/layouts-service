const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path')

const utils = require('../../buildutils');

const outputDir = path.resolve(__dirname, '../../build');

module.exports = [
    utils.createConfig(`${outputDir}/demo`, {LayoutsUI: './LayoutsUI.ts'}, true, new CopyWebpackPlugin( [{ from: '../../res/demo' }]) ),
    utils.createConfig(`${outputDir}/demo`, {Snappable: './Snappable.ts'}, true)
];
