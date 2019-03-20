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
 * Import the webpack tools from openfin-service-tooling
 */
const webpackTools = require('openfin-service-tooling').webpackTools;


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
    ]
});

module.exports = [
    webpackTools.createConfig(`${outputDir}/client`, './src/client/main.ts', {minify: false, isLibrary: true, libraryName: 'OpenFinLayouts'}, webpackTools.versionPlugin),
    webpackTools.createConfig(`${outputDir}/client`, './src/client/main.ts', {minify: true, isLibrary: true, libraryName: 'OpenFinLayouts', outputFilename: "openfin-layouts"}, webpackTools.versionPlugin),
    webpackTools.createConfig(`${outputDir}/provider`, {
        main: './src/provider/main.ts',
        tabStrip: './src/provider/tabbing/tabstrip/main.ts'
    }, undefined, webpackTools.manifestPlugin, webpackTools.versionPlugin, schemaDefaultsPlugin, schemaTypesPlugin),
    webpackTools.createConfig(`${outputDir}/provider`, './src/provider/ServiceWorker.js', {minify: true, outputFilename: "sw"}, webpackTools.versionPlugin),
    webpackTools.createConfig(`${outputDir}/demo`, {
        LayoutsUI: './src/demo/LayoutsUI.ts',
        testbed: './src/demo/testbed/index.ts',
        popup: './src/demo/popup.ts',
        deregisteredApp: './src/demo/deregisteredApp.ts',
        normalApp: './src/demo/normalApp.ts',
        saveRestoreTestingApp: './src/demo/saveRestoreTestingApp.ts',
        tabapp1: './src/demo/tabapp1.ts',
        tabapp2: './src/demo/tabapp2.ts'
    }, {isLibrary: true}, webpackTools.versionPlugin)
];
