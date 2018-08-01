'use strict';

// webpack.config.js
const webpack = require('webpack')
var path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const transform = require('./templateBuilder')

const PROD_RUNTIME_VERSION = '9.61.33.32'
const PROD_LAYOUTSMANAGER_RUNTIME_VERSION = '9.61.33.32'

module.exports = (mode) => webpack(mode === 'production' ? {
    devtool: 'inline-source-map',
    entry: {
        'provider': './build/src/SnapAndDock/Service/main.js',
        'client': './build/src/SnapAndDock/Client/global.js',
        'layoutsManager/provider': './build/src/Layouts/Service/main.js',
        'layoutsManager/client': './build/src/Layouts/Client/global.js'
    }, // file extension after index is optional for .js files
    output: {
        path: path.resolve('build'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService/',
            ignore: '*.template.json'
        }, {
            from: './resources/SnapDockService/app.template.json',
            to: 'app.json',
            transform: transform(PROD_RUNTIME_VERSION, `https://cdn.openfin.co/services/openfin/layouts/${process.env.GIT_SHORT_SHA}/provider.html`, false)
        }, {
            from: './resources/LayoutsService/',
            to: 'layoutsManager',
            ignore: '*.template.json'
        }, {
            from: './resources/LayoutsService/app.template.json',
            to: 'layoutsManager/app.json',
            transform: transform(PROD_LAYOUTSMANAGER_RUNTIME_VERSION, `https://cdn.openfin.co/services/openfin/layouts/${process.env.GIT_SHORT_SHA}/layoutsManager/provider.html`, false)
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
        'LayoutsService/provider': './build/src/Layouts/Service/main.js',
        'LayoutsService/client/global': './build/src/Layouts/Client/global.js'
    }, // file extension after index is optional for .js files
    output: {
        path: path.resolve('build'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin([{ from: './resources', ignore: '*.template.json' }]),
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService/app.template.json',
            to: 'SnapDockService/app.json',
            transform: transform(process.env.OF_RUNTIME_VERSION || PROD_RUNTIME_VERSION, 'http://localhost:1337/SnapDockService/provider.html', mode === 'development')
        },{
            from: './resources/LayoutsService/app.template.json',
            to: 'LayoutsService/app.json',
            transform: transform(process.env.PROD_LAYOUTSMANAGER_RUNTIME_VERSION || PROD_LAYOUTSMANAGER_RUNTIME_VERSION, 'http://localhost:1337/LayoutsService/provider.html', mode === 'development')
        },{
            from: './resources/test/app.template.json',
            to: 'test/app.json',
            transform: transform(process.env.OF_RUNTIME_VERSION || PROD_RUNTIME_VERSION, 'http://localhost:1337/test/test.html', false)
        },
        {
            from: './resources/SnapDockDemo/app.template.json',
            to: 'SnapDockDemo/app.json',
            transform: transform(process.env.OF_RUNTIME_VERSION || PROD_RUNTIME_VERSION, 'http://localhost:1337/SnapDockDemo/dev.html', true)
        }]),
    ],
    mode: 'development'
});
