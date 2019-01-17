const fs = require('fs');
const path = require('path');
const defaults = require('json-schema-defaults');

const BasePlugin = require('./BasePlugin');

/**
 * Webpack plugin to generate a static JSON file that contains the default value of every input schema.
 * 
 * Any top-level 'rules' object will be stripped-out of the generated JSON, as the 'rules' property has
 * special significance and isn't a part of the actual service-specific set of config options.
 * 
 * Supported options:
 * - outputPath: string
 *   Where to write generated .json files to (one file per input), either a filename or a directory.
 *   If a directory, filenames will be appended based on the input file with the extension changed.
 * - input: string|string[]
 *   The JSON Schema file(s) to generate TypeScript definitions for.
 */
class SchemaToDefaultsPlugin extends BasePlugin {
    constructor(options) {
        super('SchemaToDefaultsPlugin', ".json", options);
    }

    async run() {
        await Promise.all(this.options.input.map(async (schemaFilename) => {
            console.log(`Generating defaults for ${path.basename(schemaFilename)}`);
            
            const output = this.getDefaults(schemaFilename);
            const outputPath = this.getOutputPath(schemaFilename);
            await this.writeFile(outputPath, JSON.stringify(output, null, 4));
        }));
    }

    getDefaults(schemaFilename) {
        let schema, result;

        // Load & parse JSON schema
        try {
            schema = JSON.parse(fs.readFileSync(schemaFilename, "utf8"));
        } catch(e) {
            throw new Error(`Error parsing input schema: ${e.message}\n${e.stack}`);
        }

        // Extract default values for each parameter from the schema
        try {
            // Generate defaults JSON
            result = defaults(schema);

            // Exclude 'rules' array if empty (as it should be)
            if (result.rules && !result.rules.length) {
                delete result.rules;
            }
        } catch(e) {
            throw new Error(`Error generating schema defaults: ${e.message}\n${e.stack}`);
        }

        return result;
    }
}

module.exports = SchemaToDefaultsPlugin;
