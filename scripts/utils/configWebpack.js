
'use strict';

// webpack.config.js
const webpack = require('webpack')
var path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const transform = require('./templateBuilder')

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
            from: './resources/SnapDockService/',
            ignore: '*.template.json'
        }]),
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService/app.template.json',
            to: 'app.json',
            transform
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
        new CopyWebpackPlugin([{ from: './resources', ignore: '*.template.json' }]),
        new CopyWebpackPlugin([{ from: './resources/**/*.template.json', test: /(^.+)\.template\.json$/, to: '[1].json', transform}]),

    ],
    mode
});
