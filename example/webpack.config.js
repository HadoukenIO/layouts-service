const path = require('path')

module.exports = {
    devtool: 'inline-source-map',
    entry: {
        'frameless': './build/src/frameless.js',
        'deregistered': './build/src/deregistered.js',
        'parent': './build/src/parent.js',
    }, // file extension after index is optional for .js files
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    }
}