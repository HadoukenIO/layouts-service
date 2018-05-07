const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { remoteOrigin } = require('../deploy.config')

module.exports = (env, argv) => (argv.mode === 'production' ? {
    devtool: 'inline-source-map',
    entry: {
        'frameless': './build/src/frameless.js',
        'parent': './build/src/parent.js',
    }, // file extension after index is optional for .js files
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin([{
            from: './resources',
            transform(content, path) {
                if (path.slice(-5) !== '.json') {
                    return content;
                }
                const config = JSON.parse(content.toString())
                const startup_app = {
                    ...config.startup_app,
                    url: remoteOrigin + '/index.html'
                }
                return JSON.stringify({ ...config, startup_app }, null, 2)
            }
        }])
    ]
} : {
        devtool: 'inline-source-map',
        entry: {
            'frameless': './build/src/frameless.js',
            'parent': './build/src/parent.js',
        }, // file extension after index is optional for .js files
        output: {
            path: path.join(__dirname, 'dist'),
            filename: '[name].js'
        },
        plugins: [
            new CopyWebpackPlugin([{ from: './resources' }])
        ]
    });
