const path = require('path');
const {SchemaToDefaultsPlugin} = require('openfin-service-config/plugins/SchemaToDefaultsPlugin');
const {SchemaToTypeScriptPlugin} = require('openfin-service-config/plugins/SchemaToTypeScriptPlugin');
const {webpackTools} = require('openfin-service-tooling');

const outputDir = path.resolve(__dirname, './dist');
const schemaRoot = path.resolve(__dirname, './res/provider/config');
const schemaOutput = path.resolve(__dirname, './gen/provider/config');
const defaultsOutput = path.resolve(__dirname, './gen/provider/config/defaults.json');

/**
 * Webpack plugin to generate a static JSON file that contains the default value of every input schema.
 *
 * Any top-level 'rules' object will be stripped-out of the generated JSON, as the 'rules' property has
 * special significance and isn't a part of the actual service-specific set of config options.
 *
 * Generated code is placed inside a top-level 'gen' folder, whose structure mirrors that of
 * the 'src', 'res' and 'test' folders.
 */
const schemaDefaultsPlugin = new SchemaToDefaultsPlugin({
    outputPath: defaultsOutput,
    input: `${schemaRoot}/layouts-config.schema.json`
});

/**
 * Webpack plugin to generate TypeScript definitions from one or more JSON schema files.
 *
 * Generated code is placed inside a top-level 'gen' folder, whose structure mirrors that of
 * the 'src', 'res' and 'test' folders.
 */
const schemaTypesPlugin = new SchemaToTypeScriptPlugin({
    schemaRoot,
    outputPath: schemaOutput,
    input: [
        `${schemaRoot}/layouts-config.schema.json`
    ]
});

module.exports = [
    webpackTools.createConfig(`${outputDir}/client`, './src/client/main.ts', {minify: false, isLibrary: true, libraryName: 'layouts'}, webpackTools.versionPlugin),
    webpackTools.createConfig(`${outputDir}/client`, './src/client/main.ts', {minify: true, isLibrary: true, libraryName: 'layouts', outputFilename: "openfin-layouts"}, webpackTools.versionPlugin),
    webpackTools.createConfig(`${outputDir}/provider`, {
        main: './src/provider/main.ts',
        tabStrip: './src/provider/tabbing/tabstrip/main.ts',
        placeholder: './src/provider/workspaces/placeholder/main.ts'
    }, undefined, webpackTools.manifestPlugin, webpackTools.versionPlugin, schemaDefaultsPlugin, schemaTypesPlugin),
    webpackTools.createConfig(`${outputDir}/provider`, './src/provider/ServiceWorker.js', {minify: true, outputFilename: "sw"}, webpackTools.versionPlugin),
    webpackTools.createConfig(`${outputDir}/demo`, {
        LayoutsUI: './src/demo/LayoutsUI.ts',
        testbed: './src/demo/testbed/index.ts',
        popup: './src/demo/popup.ts',
        deregisteredApp: './src/demo/deregisteredApp.ts',
        normalApp: './src/demo/normalApp.ts',
        normalAppHangingRestoreBadChildRestoration: './src/demo/normalAppHangingRestoreBadChildRestoration.ts',
        normalAppHangingRestoreNoReady: './src/demo/normalAppHangingRestoreNoReady.ts',
        saveRestoreTestingApp: './src/demo/saveRestoreTestingApp.ts',
        tabapp1: './src/demo/tabapp1.ts',
        tabapp2: './src/demo/tabapp2.ts'
    }, {isLibrary: true}, webpackTools.versionPlugin)
];