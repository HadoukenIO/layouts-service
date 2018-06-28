
'use strict';

// webpack.config.js
const webpack = require('webpack')
var path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const transform = require('./templateBuilder')

const PROD_RUNTIME_VERSION = '8.56.30.55'

module.exports = (mode) => webpack(mode === 'production' ? {
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
            from: './resources/SnapDockService/',
            ignore: '*.template.json'
        }]),
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService/app.template.json',
            to: 'app.json',
            transform: transform(PROD_RUNTIME_VERSION, `https://cdn.openfin.co/services/openfin/layouts/${process.env.GIT_SHORT_SHA}/provider.html`, false)
        }]),
    ],
    mode
} : {
    devtool: 'inline-source-map',
    entry: {
        'SnapDockService/provider': './build/src/SnapAndDock/Service/main.js',
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
        new CopyWebpackPlugin([{ from: './resources', ignore: '*.template.json' }]),
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService/app.template.json',
            to: 'SnapDockService/app.json',
            transform: transform(process.env.OF_RUNTIME_VERSION || 'canary', 'http://localhost:1337/SnapDockService/provider.html', mode === 'development')
        }]),
    ],
    mode: 'development'
});
