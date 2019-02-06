const path = require('path');
const {compileFromFile} = require('json-schema-to-typescript');

const BasePlugin = require('./BasePlugin');

/**
 * Webpack plugin to generate TypeScript code from one or more JSON schema files.
 * 
 * Supported options:
 * - outputPath: string
 *   Where to write generated .d.ts files to, either a filename or a directory.
 *   If a directory, filenames will be appended based on the input file with the extension changed.
 * - input: string|string[]
 *   The JSON Schema file(s) to generate TypeScript definitions for.
 *   If passing multiple files, then 'outputPath' MUST be a directory rather than an absolute filename.
 * - schemaRoot: string
 *   Root directory to use when resolving "$ref" tags
 */
class SchemaToTypeScriptPlugin extends BasePlugin {
    constructor(options) {
        super('SchemaToTypeScriptPlugin', ".d.ts", options);

        // Load plugin-specific options
        this.parseOptions(options, {
            schemaRoot: 'string'
        });
    }

    async run() {
        await Promise.all(this.options.input.map(async (schemaFilename) => {
            console.log(`Generating TypeScript definitions for ${path.basename(schemaFilename)}`);
            
            const output = await compileFromFile(schemaFilename, {cwd: this.options.schemaRoot});
            const outputPath = this.getOutputPath(schemaFilename);
            await this.writeFile(outputPath, output);
        }));
    }
}

module.exports = SchemaToTypeScriptPlugin;
