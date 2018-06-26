
'use strict';

// webpack.config.js
const webpack = require('webpack')
var path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (mode, onComplete = () => undefined) => webpack(mode === 'production' ? {
    devtool: 'inline-source-map',
    entry: {
        'provider': './build/src/SnapAndDock/Service/main.js',
        'client': './build/src/SnapAndDock/Client/global.js'
    }, // file extension after index is optional for .js files
    output: {
        path: path.resolve('dist'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService/app-cdn.json',
            to: 'app.json'
        }]),
    ],
    mode
} : {
    devtool: 'inline-source-map',
    entry: {
        'SnapDockService/main': './build/src/SnapAndDock/Service/main.js',
        'SnapDockService/client/main': './build/src/SnapAndDock/Client/main.js',
        'SnapDockService/client/global': './build/src/SnapAndDock/Client/global.js',
        'SnapDockService/client/withLaunch': './src/SnapAndDock/Client/withLaunch.js',
        'Layouts/Service/index': './build/src/Layouts/Service/index.js',
        'Layouts/Client/index': './build/src/Layouts/Client/index.js'
    }, // file extension after index is optional for .js files
    output: {
        path: path.resolve('dist'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin([{ from: './resources' }]),
    ],
    mode
});
