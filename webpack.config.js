
'use strict';

// webpack.config.js
var path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const {remoteOrigin} = require('./deploy.config')

module.exports = (env, argv) => (argv.mode === 'production' ? {
    devtool: 'inline-source-map',
    entry: {
        'main': './build/src/SnapAndDock/main.js',
        'client/main': './build/src/SnapAndDock/Client/global.js'
    }, // file extension after index is optional for .js files
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin([{
            from: './resources/SnapDockService',
            transform(content, path) {
                if (path.slice(-5) !== '.json') {
                    return content;
                }
                const config = JSON.parse(content.toString())
                const runtime = {
                    ...config.runtime,
                    version: '8.56.30.42',
                }
                const startup_app = {
                    ...config.startup_app,
                    autoShow: false,
                    url: remoteOrigin+'/index.html'
                }
                return JSON.stringify({...config, runtime, startup_app},null, 2)
            }
        }])
    ]
} : {
        devtool: 'inline-source-map',
        entry: {
            'SnapDockService/main': './build/src/SnapAndDock/main.js',
            'SnapDockService/client/main': './build/src/SnapAndDock/Client/main.js',
            'SnapDockService/client/global': './build/src/SnapAndDock/Client/global.js',
            'SnapDockService/client/withLaunch': './src/SnapAndDock/Client/withLaunch.js',
            'Layouts/Service/index': './build/src/Layouts/Service/index.js',
            'Layouts/Client/index': './build/src/Layouts/Client/index.js'
        }, // file extension after index is optional for .js files
        output: {
            path: path.join(__dirname, 'dist'),
            filename: '[name].js'
        },
        plugins: [
            new CopyWebpackPlugin([{ from: './resources' }])
        ]
    });
