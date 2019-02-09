const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const SchemaToDefaultsPlugin = require('./scripts/plugins/SchemaToDefaultsPlugin');
const SchemaToTypeScriptPlugin = require('./scripts/plugins/SchemaToTypeScriptPlugin');

const version = require("./package.json").version;
const outputDir = path.resolve(__dirname, './dist');
const schemaRoot = path.resolve(__dirname, './res/provider/config');
const schemaOutput = path.resolve(__dirname, './gen/provider/config');
const defaultsOutput = path.resolve(__dirname, './gen/provider/config/defaults.json');

/**
 * Shared function to create a webpack config for an entry point
 * 
 * Options ('options' object is optional, as are all members within):
 *  - minify {boolean}
 *      If webpack should minify this module
 *      Defaults to true
 *  - isLibrary {boolean}
 *      If the resulting module should inject itself into the window object to make 
 *      itself easily accessible within HTML.
 *      Defaults to false
 *  - plugins {...object[]}
 *      Optional list of plugins to add to the config object
 *      Defaults to empty list
 *  - outputFilename {string}
 *      Allows a custom output file name to be used instead of the default [name]-bundle.js
 */
function createConfig(outPath, entryPoint, options, ...plugins) {
    const config = {
        entry: entryPoint,
        optimization: {
            minimize: !options || options.minify !== false
        },
        output: {
            path: outPath,
            filename: `${options && options.outputFilename || '[name]-bundle'}.js`
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader'
                }
            ]
        },
        plugins: []
    };

    if (options && options.isLibrary === true) {
        if (!!options.libraryName) {
            config.output.library = options.libraryName;
        } else {
            config.output.library = '[name]';
        }
        config.output.libraryTarget = 'umd';
    }
    if (plugins && plugins.length) {
        config.plugins.push.apply(config.plugins, plugins);
    }

    return config;
}

/**
 * Provider temporarily requires an extra plugin to override index.html within provider app.json
 * Will be removed once the RVM supports relative paths within app.json files
 */
const manifestPlugin = new CopyWebpackPlugin([{
    from: 'res/provider/app.json',
    to: '.',
    transform: (content) => {
        const config = JSON.parse(content);

        if (typeof process.env.SERVICE_VERSION !== 'undefined' && process.env.SERVICE_VERSION !== "") {
            config.startup_app.url = 'https://cdn.openfin.co/services/openfin/layouts/' + process.env.SERVICE_VERSION + '/provider.html';
            config.startup_app.autoShow = false;
        } else {
            console.warn("Using 'npm run build' (or build:dev) when running locally. Can debug without building first by running 'npm start'.");
            config.startup_app.url = 'http://localhost:1337/provider/provider.html';
        }

        return JSON.stringify(config, null, 4);
    }
}]);

/**
 * Replaces 'PACKAGE_VERSION' constant in source files with the current version of the service,
 * taken from the 'package.json' file.
 * 
 * This embeds the package version into the source file as a string constant.
 */
const versionPlugin = new webpack.DefinePlugin({PACKAGE_VERSION: `'${version}'`});

/**
 * Generate TypeScript definition files from the config schema files.
 * 
 * Generated code is placed inside a top-level 'gen' folder, whose structure mirrors that of 
 * the 'src', 'res' and 'test' folders.
 */
const schemaDefaultsPlugin = new SchemaToDefaultsPlugin({
    outputPath: defaultsOutput,
    input: `${schemaRoot}/layouts-config.schema.json`
});

/**
 * Generate TypeScript definition files from the config schema files.
 * 
 * Generated code is placed inside a top-level 'gen' folder, whose structure mirrors that of 
 * the 'src', 'res' and 'test' folders.
 */
const schemaTypesPlugin = new SchemaToTypeScriptPlugin({
    schemaRoot,
    outputPath: schemaOutput,
    input: [
        `${schemaRoot}/layouts-config.schema.json`,
        `${schemaRoot}/scope.schema.json`
    ]
});

module.exports = [
    createConfig(`${outputDir}/client`, './src/client/main.ts', {minify: false, isLibrary: true, libraryName: 'OpenFinLayouts'}, versionPlugin),
    createConfig(`${outputDir}/client`, './src/client/main.ts', {minify: true, isLibrary: true, libraryName: 'OpenFinLayouts', outputFilename: "openfin-layouts"}, versionPlugin),
    createConfig(`${outputDir}/provider`, {
        main: './src/provider/main.ts',
        tabStrip: './src/provider/tabbing/tabstrip/main.ts'
    }, undefined, manifestPlugin, versionPlugin, schemaDefaultsPlugin, schemaTypesPlugin),
    createConfig(`${outputDir}/demo`, {
        LayoutsUI: './src/demo/LayoutsUI.ts',
        sample: './src/demo/sample.ts',
        popup: './src/demo/popup.ts',
        deregisteredApp: './src/demo/deregisteredApp.ts',
        normalApp: './src/demo/normalApp.ts',
        saveRestoreTestingApp: './src/demo/saveRestoreTestingApp.ts',
        tabapp1: './src/demo/tabapp1.ts',
        tabapp2: './src/demo/tabapp2.ts'
    }, {isLibrary: true}, versionPlugin)
];
